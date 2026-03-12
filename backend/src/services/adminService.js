const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const adminRepo = require('../data/adminRepository');
const userRepo = require('../data/userRepository');
const { buildAccessToken } = require('../helpers/JWTHelper');
const { isString} = require('../helpers/GeneralHelper');

class AdminService {
async registerAdmin({ username,password }){

  username = isString(username,'username required');
  password = isString(password,'password required');

  const existingAdmin = await adminRepo.adminExists();

  if(existingAdmin){
    throw new Error('admin already exists');
  }

  const role = await adminRepo.getRoleByName('مدير');

  if(!role){
    throw new Error('admin role not found');
  }

  const passwordHash = await bcrypt.hash(password,10);

  const id = randomUUID();

  await adminRepo.createAdminUser({
    id,
    username,
    passwordHash,
    roleId:role.id
  });

  return {
    id,
    username,
    role:'مدير'
  };

}

  async login({ username, password }) {
    username = isString(username, 'username is required');
    password = isString(password, 'password is required');
    const admin = await adminRepo.findAdminByUsername(username);
    if (!admin) throw new Error('invalid credentials');
    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) throw new Error('invalid credentials');
    const token = buildAccessToken({ id: admin.id, username: admin.username });
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await userRepo.insertJwtToken({ id: randomUUID(), userId: admin.id, token, expiresAt, revoked: false });
    return { id: admin.id, username: admin.username, token };
  }

  async logout({ userId, token }) {
    const rec = await userRepo.getTokenByValue(token);
    if (!rec) return { success: true };
    if (rec.user_id !== userId) throw new Error('invalid token for user');
    await userRepo.revokeToken(token);
    return { message:"logged out successfully" };
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

  async createUser({ username, password, role }) {

  username = isString(username,'username required');
  password = isString(password,'password required');
  role = isString(role,'role required');

  const existingUser = await userRepo.findUserByUsername(username);

  if(existingUser){
    throw new Error('username already exists');
  }

  const roleData = await adminRepo.getRoleByName(role);

  if(!roleData){
    throw new Error('role not found');
  }

  const passwordHash = await bcrypt.hash(password,10);

  const id = randomUUID();

  await userRepo.createUser({
    id,
    username,
    passwordHash,
    roleId: roleData.id
  });

  return {
    id,
    username,
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