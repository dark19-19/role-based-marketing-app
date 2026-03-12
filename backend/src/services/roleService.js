const { randomUUID } = require('crypto');
const roleRepo = require('../data/roleRepository');
const { isString, isUuid } = require('../helpers/GeneralHelper');

class RoleService {

  async createRole({ name }) {
    try {

      name = isString(name, 'اسم الدور مطلوب');

      const exists = await roleRepo.findByName(name);
      if (exists) throw new Error('هذا الدور موجود مسبقاً');

      const role = await roleRepo.create({
        id: randomUUID(),
        name
      });

      return role;

    } catch (err) {
      throw err;
    }
  }

  async getRoles() {
    try {

      return await roleRepo.findAll();

    } catch (err) {
      throw err;
    }
  }

  async getRoleById(id) {
    try {

      id = isUuid(id);

      const role = await roleRepo.findById(id);
      if (!role) throw new Error('الدور غير موجود');

      return role;

    } catch (err) {
      throw err;
    }
  }

  async updateRole({ id, name }) {
    try {

      id = isUuid(id);
      name = isString(name, 'اسم الدور مطلوب');

      const role = await roleRepo.update(id, name);
      if (!role) throw new Error('الدور غير موجود');

      return role;

    } catch (err) {
      throw err;
    }
  }

  async deleteRole(id) {
    try {

      id = isUuid(id);

      const role = await roleRepo.findById(id);
      if (!role) throw new Error('الدور غير موجود');

      await roleRepo.delete(id);

      return true;

    } catch (err) {
      throw err;
    }
  }

}

module.exports = new RoleService();