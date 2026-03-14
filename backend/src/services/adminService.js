const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const adminRepo = require('../data/adminRepository');
const userRepo = require('../data/userRepository');
const { buildAccessToken } = require('../helpers/JWTHelper');
const { isString} = require('../helpers/GeneralHelper');
const authRepo = require("../data/authRepository");
const roleRepo = require('../data/roleRepository')

class AdminService {
async registerAdmin({first_name, last_name, phone ,password }){

  first_name = isString(first_name, "يرجى إدخال اسم أول صحيح")
  last_name = isString(last_name,"يرجى إدخال اسم ثاني صحيح")
  phone = isString(phone,'رقم الهاتف مطلوب');
  password = isString(password,'كلمة المرور مطلوبة');

  const role = await adminRepo.getRoleByName('ADMIN');

  if(!role){
    throw new Error('admin role not found');
  }

  const passwordHash = await bcrypt.hash(password,10);

  const id = randomUUID();

  await adminRepo.createAdminUser({
    id,
    first_name,
    last_name,
    phone,
    passwordHash,
    roleId:role.id
  });

  return {
    id,
    first_name,
    last_name,
    phone,
    role:'ADMIN'
  };

}


  async listUsers({ page = 1, limit = 20, order = 'desc' } = {}) {
    // Use loose validation for query params as they come as strings usually
    const p = Number(page);
    const l = Number(limit);
    
    const validatedPage = (Number.isNaN(p) || p < 1) ? 1 : p;
    const validatedLimit = (Number.isNaN(l) || l < 1) ? 20 : Math.min(l, 100);
    const offset = (validatedPage - 1) * validatedLimit;

    const [users, total] = await Promise.all([
      userRepo.findAllUsers({ limit: validatedLimit, offset, order }),
      userRepo.countUsers()
    ]);

    return {
      users,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        total,
        totalPages: Math.ceil(total / validatedLimit)
      }
    };
  }

  async createUser({first_name,last_name, phone, password, role }) {

    first_name = isString(first_name, "يرجى إدخال اسم أول صحيح");
    last_name = isString(last_name, "يرجى إدخال اسم ثاني صحيح")
  phone = isString(phone,'رقم الهاتف مطلوب');
  password = isString(password,'رقم الهاتف مطلوب');
  role = isString(role,'الدور مطلوب');

    const existing = await authRepo.findUserByPhone(phone);

    if (existing) {
      throw new Error('رقم الهاتف مستخدم مسبقاً');
    }

  const roleData = await roleRepo.findByName(role);

  if(!roleData){
    throw new Error('دور العميل غير موجود');
  }

  const passwordHash = await bcrypt.hash(password,10);

  const id = randomUUID();

  await userRepo.createUser({
    id,
    first_name,
    last_name,
    phone,
    passwordHash,
    role_id: roleData.id
  });

  return {
    id,
    first_name,
    last_name,
    phone,
    role: roleData.name
  };
}

  async searchUsers({ query }) {
    const q = isString(query, 'query is required');
    if (q.trim().length === 0) return [];
    return await userRepo.searchUsers(q);
  }
}

module.exports = new AdminService();