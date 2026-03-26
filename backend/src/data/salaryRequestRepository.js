const db = require('../helpers/DBHelper');
const { randomUUID } = require('crypto');

class SalaryRequestRepository {

    async create(data) {
        const id = randomUUID();

        await db.query(`
            INSERT INTO salary_requests
            (id, employee_id, requested_amount, status)
            VALUES ($1, $2, $3, $4)
        `, [
            id,
            data.employee_id,
            data.requested_amount,
            data.status || 'PENDING'
        ]);

        return id;
    }

    async findByEmployeeId(employeeId) {
        const { rows } = await db.query(`
            SELECT
                sr.id,
                sr.requested_amount,
                sr.status,
                sr.created_at
            FROM salary_requests sr
            WHERE sr.employee_id = $1
            ORDER BY sr.created_at DESC
        `, [employeeId]);

        return rows;
    }

    async findById(id) {
        const { rows } = await db.query(`
            SELECT * FROM salary_requests WHERE id = $1
        `, [id]);

        return rows[0] || null;
    }

    async updateStatus(id, status) {
        await db.query(`
            UPDATE salary_requests
            SET status = $1
            WHERE id = $2
        `, [status, id]);
    }

}

module.exports = new SalaryRequestRepository();