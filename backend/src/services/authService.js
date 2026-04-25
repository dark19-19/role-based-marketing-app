const bcrypt = require("bcrypt");
const { randomUUID } = require("crypto");
const { randomBytes, createHash } = require("crypto");
const authRepo = require("../data/authRepository");
const userRepo = require("../data/userRepository");
const customerRepo = require("../data/customerRepository");
const db = require("../helpers/DBHelper");
const { buildAccessToken } = require("../helpers/JWTHelper");
const { isString } = require("../helpers/GeneralHelper");
const roleRepo = require("../data/roleRepository");
const resetKeyRepo = require("../data/resetKeyRepository");

class AuthService {
  async login({ phone, password }) {
    try {
      phone = isString(phone, "رقم الهاتف مطلوب");
      password = isString(password, "كلمة المرور مطلوبة");

      const user = await authRepo.findUserByPhone(phone);

      if (!user) {
        throw new Error("بيانات تسجيل الدخول غير صحيحة");
      }

      if (!user.is_active) {
        throw new Error("الحساب غير مفعل");
      }

      const ok = await bcrypt.compare(password, user.password);

      if (!ok) {
        throw new Error("بيانات تسجيل الدخول غير صحيحة");
      }

      const token = buildAccessToken({
        id: user.id,
        phone: user.phone,
        role: user.role,
      });

       const expiresAt = new Date(Date.now() + 30 * 60 * 1000 );
      // Revoke all previous tokens for this user to enforce single session
      await userRepo.revokeAllTokensForUser(user.id);

      await userRepo.insertJwtToken({
        id: randomUUID(),
        user_id: user.id,
        token,
        expiresAt,
        revoked: false,
      });

      await authRepo.setLastLogin(phone);

      return {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`.trim(),
        phone: user.phone,
        role: user.role,
        employee_id: user.employee_id,
        branch_id: user.branch_id,
        branch_name: user.branch_name,
        token,
      };
    } catch (err) {
      throw err;
    }
  }

  async registerCustomer({ first_name, last_name, phone, password, question = null, answer = null }) {
    try {
      first_name = isString(first_name, "يرجى إدخال اسم أول صحيح");
      last_name = isString(last_name, "يرجى إدخال اسم ثاني صحيح");
      phone = isString(phone, "رقم الهاتف مطلوب");
      password = isString(password, "كلمة المرور مطلوبة");
      // question = isString(question, "السؤال مطلوب");
      // answer = isString(answer, "الإجابة مطلوبة");

      const existing = await authRepo.findUserByPhone(phone);

      if (existing) {
        throw new Error("رقم الهاتف مستخدم مسبقاً");
      }

      const role = await roleRepo.findByName("CUSTOMER");

      if (!role) {
        throw new Error("دور العميل غير موجود");
      }

      const hash = await bcrypt.hash(password, 10);
      // const answerHash = await bcrypt.hash(answer, 10);
      const id = randomUUID();

      await authRepo.createCustomerUser({
        id,
        first_name,
        last_name,
        phone,
        passwordHash: hash,
        role_id: role.id,
        question,
        answer: answer,
      });

      // Create a customer record linked to this user
      try {
        await db.query(
          `INSERT INTO customers (id, user_id, governorate_id, referred_by, first_marketer_id)
           VALUES ($1, $2, NULL, NULL, NULL)`,
          [randomUUID(), id]
        );
        console.log(`✅ Customer record created for user: ${id}`);
      } catch (customerErr) {
        console.warn(`⚠️ Warning: Could not create customer record:`, customerErr.message);
      }

      const token = buildAccessToken({
        id,
        phone,
        role: "CUSTOMER",
      });

      const expiresAt = new Date(Date.now() + 60 * 60 * 1000 * 3 * 24);

      // Revoke all previous tokens (just in case)
      await userRepo.revokeAllTokensForUser(id);

      await userRepo.insertJwtToken({
        id: randomUUID(),
        user_id: id,
        token,
        expiresAt,
        revoked: false,
      });

      return {
        id,
        phone,
        role: "CUSTOMER",
        token,
      };
    } catch (err) {
      throw err;
    }
  }

  async getForgotPasswordQuestion({ phone }) {
    phone = isString(phone, "رقم الهاتف مطلوب");
    const user = await authRepo.findUserByPhone(phone);
    if (!user || user.role !== "CUSTOMER") throw new Error("المستخدم غير موجود");
    if (!user.is_active) throw new Error("الحساب غير مفعل");

    const full = await userRepo.findById(user.id);
    if (!full || !full.question) throw new Error("لا يوجد سؤال لهذا الحساب");

    return { question: full.question };
  }

  async answerForgotPasswordQuestion({ phone, question, answer }) {
    phone = isString(phone, "رقم الهاتف مطلوب");
    question = isString(question, "السؤال مطلوب");
    answer = isString(answer, "الإجابة مطلوبة");

    const user = await authRepo.findUserByPhone(phone);
    if (!user || user.role !== "CUSTOMER") throw new Error("المستخدم غير موجود");
    if (!user.is_active) throw new Error("الحساب غير مفعل");

    const full = await userRepo.findById(user.id);
    if (!full || !full.question || !full.answer) throw new Error("لا يوجد سؤال لهذا الحساب");
    if (full.question !== question) throw new Error("السؤال غير صحيح");

    const ok = await bcrypt.compare(answer, full.answer);
    if (!ok) throw new Error("الإجابة غير صحيحة");

    const resetKey = randomBytes(32).toString("hex");
    const pepper = process.env.JWT_SECRET || "";
    const resetKeyHash = createHash("sha256").update(`${resetKey}.${pepper}`).digest("hex");

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await resetKeyRepo.create({ userId: user.id, resetKeyHash, expiresAt });

    return { reset_key: resetKey };
  }

  async resetPasswordWithKey({ reset_key, new_password, confirmed_password }) {
    reset_key = isString(reset_key, "reset_key مطلوب");
    new_password = isString(new_password, "كلمة المرور الجديدة مطلوبة");
    confirmed_password = isString(confirmed_password, "تأكيد كلمة المرور مطلوب");

    if (new_password !== confirmed_password) throw new Error("كلمتا المرور غير متطابقتين");

    const pepper = process.env.JWT_SECRET || "";
    const resetKeyHash = createHash("sha256").update(`${reset_key}.${pepper}`).digest("hex");
    const rec = await resetKeyRepo.consumeValid(resetKeyHash);
    if (!rec) throw new Error("key expired");

    const user = await userRepo.findById(rec.user_id);
    if (!user) throw new Error("المستخدم غير موجود");

    const hash = await bcrypt.hash(new_password, 10);
    await userRepo.updatePassword(user.id, hash);
    await userRepo.revokeAllTokensForUser(user.id);

    return { message: "تم تغيير كلمة المرور بنجاح" };
  }
  async me(user_id) {
    try {
      const user = await authRepo.me(user_id);
      if (!user) {
        throw new Error("المستخدم غير موجود");
      }

      return {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`.trim(),
        phone: user.phone,
        role: user.role,
        is_active: user.is_active,
        employee_id: user.employee_id,
        branch_id: user.branch_id,
        branch_name: user.branch_name,
      };
    } catch (err) {
      throw err;
    }
  }

  async updateProfile({ userId, first_name, last_name }) {
    try {
      if (!first_name || !first_name.trim())
        throw new Error("الاسم الأول مطلوب");
      if (!last_name || !last_name.trim())
        throw new Error("الاسم الأخير مطلوب");

      const updated = await authRepo.updateName(
        userId,
        first_name.trim(),
        last_name.trim(),
      );
      if (!updated) throw new Error("المستخدم غير موجود");

      return {
        name: `${updated.first_name} ${updated.last_name}`.trim(),
        first_name: updated.first_name,
        last_name: updated.last_name,
      };
    } catch (err) {
      throw err;
    }
  }
  async logout({ userId, token }) {
    try {
      const rec = await userRepo.getTokenByValue(token);

      if (!rec) {
        return { message: "تم تسجيل الخروج بنجاح" };
      }

      if (rec.user_id !== userId) {
        throw new Error("رمز المصادقة غير صالح");
      }

      await userRepo.revokeToken(token);

      return {
        message: "تم تسجيل الخروج بنجاح",
      };
    } catch (err) {
      throw err;
    }
  }

  async changePassword({ userId, oldPassword, newPassword }) {
    try {
      oldPassword = isString(oldPassword, "كلمة المرور القديمة مطلوبة");
      newPassword = isString(newPassword, "كلمة المرور الجديدة مطلوبة");

      const user = await userRepo.findById(userId);
      if (!user) throw new Error("المستخدم غير موجود");

      const ok = await bcrypt.compare(oldPassword, user.password);
      if (!ok) throw new Error("كلمة المرور القديمة غير صحيحة");

      const hash = await bcrypt.hash(newPassword, 10);
      await userRepo.updatePassword(userId, hash);
      // Revoke all existing tokens for this user to force logout
      await userRepo.revokeAllTokensForUser(userId);

      return { message: "تم تغيير كلمة المرور بنجاح" };
    } catch (err) {
      throw err;
    }
  }

  async refreshToken({ userId, phone, role }) {
    try {
      const token = buildAccessToken({
        id: userId,
        phone,
        role,
      });

      const expiresAt = new Date(Date.now() + 60 * 60 * 1000 * 3 * 24);

      // Keep the current session alive but provide a new rotated token if needed
      // Or we can revoke previous ones to ensure even the refresh rotates strictly
      await userRepo.revokeAllTokensForUser(userId);

      await userRepo.insertJwtToken({
        id: randomUUID(),
        user_id: userId,
        token,
        expiresAt,
        revoked: false,
      });

      return { token };
    } catch (err) {
      throw err;
    }
  }
}
module.exports = new AuthService();
