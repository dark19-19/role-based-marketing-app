const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const adminRepo = require('../data/adminRepository');
const userRepo = require('../data/userRepository');
const employeeRepo = require('../data/employeeRepository');
const { buildAccessToken } = require('../helpers/JWTHelper');
const { isString} = require('../helpers/GeneralHelper');
const authRepo = require("../data/authRepository");
const roleRepo = require('../data/roleRepository')
const employeeService = require('./employeeService');

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

  async createUser(currentUser, {first_name, last_name, phone, password, role, branch_id, supervisor_id }) {

    first_name = isString(first_name, "يرجى إدخال اسم أول صحيح");
    last_name = isString(last_name, "يرجى إدخال اسم ثاني صحيح")
  phone = isString(phone,'رقم الهاتف مطلوب');
  password = isString(password,'كلمة المرور مطلوبة');
  role = isString(role,'الدور مطلوب');

  // Role visibility & permission check
  const creatorRole = currentUser.role;
  const targetRole = role;

  if (creatorRole !== 'ADMIN') {
      const allowedRoles = {
          'GENERAL_SUPERVISOR': ['SUPERVISOR', 'MARKETER'],
          'SUPERVISOR': ['MARKETER']
      };

      if (!allowedRoles[creatorRole] || !allowedRoles[creatorRole].includes(targetRole)) {
          throw new Error('ليس لديك صلاحية لانشاء هذا الدور');
      }

      // Automatically assign supervisor if the creator is supervisor/general_supervisor
      // and they are adding a marketer (unless already specified by general_supervisor)
      if (creatorRole === 'SUPERVISOR' && targetRole === 'MARKETER') {
          const creatorEmployee = await employeeRepo.findByUserId(currentUser.id);
          if (!creatorEmployee) {
              throw new Error('لم يتم العثور على بيانات الموظف الخاصة بك كمشرف');
          }
          supervisor_id = creatorEmployee.id;
      }
  }

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

    await employeeService.createEmployee({
      userId: id,
      role: role,
      branchId: branch_id,
      supervisorId: supervisor_id
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