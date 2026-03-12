const db = require('../helpers/DBHelper');

class AdminRepository {

  async adminExists(){

    const sql = `
      SELECT u.id
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE r.name='مدير'
      LIMIT 1
    `;

    const { rows } = await db.query(sql);

    return rows.length > 0;
  }

  async findAdminByUsername(username){

    const sql = `
      SELECT u.id, u.username, u.password
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.username=$1
      AND r.name='مدير'
      LIMIT 1
    `;

    const { rows } = await db.query(sql,[username]);

    return rows[0] || null;
  }

  async getUserIsAdminById(userId){

    const sql = `
      SELECT r.name
      FROM users u
      JOIN roles r ON r.id=u.role_id
      WHERE u.id=$1
    `;

    const { rows } = await db.query(sql,[userId]);

    if(!rows[0]) return false;

    return rows[0].name === 'مدير';
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

  async createAdminUser({ id, username, passwordHash, roleId }){

    const sql = `
      INSERT INTO users(id,username,password,role_id)
      VALUES($1,$2,$3,$4)
    `;

    await db.query(sql,[id,username,passwordHash,roleId]);
  }

}

module.exports = new AdminRepository();