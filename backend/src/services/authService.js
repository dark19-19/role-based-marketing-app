const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const authRepo = require('../data/authRepository');
const userRepo = require('../data/userRepository');
const { buildAccessToken } = require('../helpers/JWTHelper');
const { isString } = require('../helpers/GeneralHelper');
const roleRepo = require('../data/roleRepository');

class AuthService {

  async login({phone, password}) {

    try {

      phone = isString(phone, 'رقم الهاتف مطلوب');
      password = isString(password, 'كلمة المرور مطلوبة');

      const user = await authRepo.findUserByPhone(phone);

      if (!user) {
        throw new Error('بيانات تسجيل الدخول غير صحيحة');
      }

      if (!user.is_active) {
        throw new Error('الحساب غير مفعل');
      }

      const ok = await bcrypt.compare(password, user.password);

      if (!ok) {
        throw new Error('بيانات تسجيل الدخول غير صحيحة');
      }

      const token = buildAccessToken({
        id: user.id,
        phone: user.phone,
        role: user.role
      });

      const expiresAt = new Date(Date.now() + 60 * 60 * 1000 * 3);

      await userRepo.insertJwtToken({
        id: randomUUID(),
        user_id: user.id,
        token,
        expiresAt,
        revoked: false
      });

      await authRepo.setLastLogin(phone)

      return {
        id: user.id,
        phone: user.phone,
        role: user.role,
        token
      };

    } catch (err) {
      throw err;
    }

  }

  async registerCustomer({first_name, last_name, phone, password }) {

    try {
      first_name = isString(first_name, "يرجى إدخال اسم أول صحيح");
      last_name = isString(last_name, "يرجى إدخال اسم ثاني صحيح")
      phone = isString(phone, 'رقم الهاتف مطلوب');
      password = isString(password, 'كلمة المرور مطلوبة');

      const existing = await authRepo.findUserByPhone(phone);

      if (existing) {
        throw new Error('رقم الهاتف مستخدم مسبقاً');
      }

      const role = await roleRepo.findByName('زبون');

      if (!role) {
        throw new Error('دور العميل غير موجود');
      }

      const hash = await bcrypt.hash(password, 10);
      const id = randomUUID();

      await authRepo.createCustomerUser({
        id,
        first_name,
        last_name,
        phone,
        passwordHash: hash,
        role_id: role.id
      });

      const token = buildAccessToken({
        id,
        phone,
        role: 'CUSTOMER'
      });

      const expiresAt = new Date(Date.now() + 60 * 60 * 1000 * 3);

      await userRepo.insertJwtToken({
        id: randomUUID(),
        user_id: id,
        token,
        expiresAt,
        revoked: false
      });

      return {
        id,
        phone,
        role: 'CUSTOMER',
        token
      };

    } catch (err) {
      throw err;
    }

  }
  async me(user_id) {

    try {
      const user = await authRepo.me(user_id)
      if (!user) {
        throw new Error('المستخدم غير موجود');
      }

      return {
        id: user.id,
        phone: user.phone,
        role: user.role,
        is_active: user.is_active
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
        throw new Error('رمز المصادقة غير صالح');
      }

      await userRepo.revokeToken(token);

      return {
        message: "تم تسجيل الخروج بنجاح"
      };

    } catch (err) {
      throw err;
    }

  }

}
module.exports = new AuthService();