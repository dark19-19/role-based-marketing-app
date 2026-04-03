const db = require('../helpers/DBHelper');

class AdminRepository {

  async getUserIsAdminById(userId){

    const sql = `
      SELECT r.name
      FROM users u
      JOIN roles r ON r.id=u.role_id
      WHERE u.id=$1
    `;

    const { rows } = await db.query(sql,[userId]);

    if(!rows[0]) return false;

    return rows[0].name === 'ADMIN';
  }

  async getRoleByName(name){

    const sql = `
      SELECT id
      FROM roles
      WHERE name=$1
      LIMIT 1
    `;

    const { rows } = await db.query(sql,[name]);

    return rows[0];
  }

  async createAdminUser({ id,first_name, last_name, phone, passwordHash, roleId }){

    const sql = `
      INSERT INTO users(id,first_name,last_name,phone,password,role_id)
      VALUES($1,$2,$3,$4,$5,$6)
    `;

    await db.query(sql,[id,first_name,last_name,phone,passwordHash,roleId]);
  }

  async getCompanyAccount() {
    const sql = `
      SELECT u.id as user_id, u.phone as phone, r.name as role, e.id as emp_id
        FROM users u INNER JOIN roles r ON r.id = u.role_id
        LEFT JOIN employees e ON e.user_id = u.id
        WHERE r.name = 'ADMIN'
        ORDER BY u.created_at ASC
        LIMIT 1
    `
    const {rows} = await db.query(sql);
    return rows[0];
  }

}

module.exports = new AdminRepository();