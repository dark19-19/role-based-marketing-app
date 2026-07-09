const db = require('../helpers/DBHelper');
const { randomUUID } = require('crypto');

class SalaryRequestRepository {

    async create(client, employeeId, amount, details = {}) {

        const { full_name, phone_number, address, payment_method, note, branch_id } = details || {};
        const safeFullName = full_name ?? 'empty';
        const safePhoneNumber = phone_number ?? 'empty';
        const safeAddress = address ?? 'empty';
        const safePaymentMethod = payment_method ?? 'empty';

        const { rows } = await client.query(`
    INSERT INTO salary_requests (
      id,
      employee_id,
      requested_amount,
      status,
      full_name,
      phone_number,
      address,
      payment_method,
      note,
      branch_id
    )
    VALUES (gen_random_uuid(), $1, $2, 'PENDING', $3, $4, $5, $6, $7, $8)
    RETURNING *
  `,[employeeId, amount, safeFullName, safePhoneNumber, safeAddress, safePaymentMethod, note ?? null, branch_id ?? null]);

        return rows[0];

    }
    async getEmployeeBalanceTransactions(employeeId){

        const { rows } = await db.query(`
    SELECT *
    FROM wallet_transactions
    WHERE employee_id = $1
    AND type IN ('BALANCE', 'BONUS')
  `,[employeeId]);

        return rows;

    }

    async attachTransactions(client, requestId, transactionIds){

        for(const id of transactionIds){

            await client.query(`
      INSERT INTO salary_request_transactions
      (salary_request_id, transaction_id)
      VALUES ($1,$2)
    `,[requestId,id]);

        }

    }

    async updateTransactionsType(client, ids, type){

        await client.query(`
    UPDATE wallet_transactions
    SET type = $2
    WHERE id = ANY($1)
  `,[ids,type]);

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
            LIMIT 5
        `, [employeeId]);

        return rows;
    }

    async findById(id) {
        const { rows } = await db.query(`
            SELECT * FROM salary_requests WHERE id = $1
        `, [id]);

        return rows[0] || null;
    }

    async updateStatus(client, id, status, adjustmentType = null, adjustmentAmount = null) {
        const queryClient = client || db;
        if (adjustmentType !== null && adjustmentAmount !== null) {
            await queryClient.query(`
                UPDATE salary_requests
                SET status = $1, adjustment_type = $3, adjustment_amount = $4
                WHERE id = $2
            `, [status, id, adjustmentType, adjustmentAmount]);
        } else {
            await queryClient.query(`
                UPDATE salary_requests
                SET status = $1
                WHERE id = $2
            `, [status, id]);
        }
    }

    async getPendingByEmployeeId(employeeId) {
        const { rows } = await db.query(`
            SELECT id, requested_amount
            FROM salary_requests
            WHERE employee_id = $1
            AND status = 'PENDING'
        `, [employeeId]);
        return rows;
    }

    async bulkUpdateStatus(ids, status, client) {
        await client.query(
            `
            UPDATE salary_requests
            SET status = $1
            WHERE id = ANY($2)
            `,
            [status, ids]
        );
    }

    async listPaginated({ limit, offset, role, employeeId, branchId, status, paymentMethod, requestBranchId }) {

        let conditions = [];
        let values = [];
        let idx = 1;

        if (status && status !== 'ALL') {
             conditions.push(`sr.status = $${idx++}`);
             values.push(status);
        }

        if (paymentMethod && paymentMethod !== 'ALL') {
            conditions.push(`sr.payment_method = $${idx++}`);
            values.push(paymentMethod);
        }

        if (requestBranchId && requestBranchId !== 'ALL') {
            conditions.push(`COALESCE(sr.branch_id, e.branch_id) = $${idx++}`);
            values.push(requestBranchId);
        }

        if (role === 'MARKETER' || role === 'SUPERVISOR' || role === 'GENERAL_SUPERVISOR') {
            conditions.push(`sr.employee_id = $${idx++}`);
            values.push(employeeId);
        }

        if (role === 'BRANCH_MANAGER') {
            conditions.push(`COALESCE(sr.branch_id, e.branch_id) = $${idx++}`);
            values.push(branchId);
        }

        const whereClause =
            conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const query = `
    SELECT
      sr.id,
      sr.requested_amount AS amount,
      sr.status,
      sr.created_at AS requestDate,
      sr.full_name,
      sr.phone_number,
      sr.address,
      sr.payment_method,
      sr.adjustment_type,
      sr.adjustment_amount,
      COALESCE(sr.branch_id, e.branch_id) AS branch_id,

      u.first_name || ' ' || u.last_name AS employeeName,
      u.phone,

      r.name AS role,

      g.name AS branch

    FROM salary_requests sr

    JOIN employees e
      ON e.id = sr.employee_id

    JOIN users u
      ON u.id = e.user_id

    JOIN roles r
      ON r.id = u.role_id

    JOIN branches b
      ON b.id = COALESCE(sr.branch_id, e.branch_id)

    JOIN governorates g
      ON g.id = b.governorate_id

    ${whereClause}

    ORDER BY sr.created_at DESC
    LIMIT $${idx++}
    OFFSET $${idx}
  `;

        values.push(limit, offset);

        const { rows } = await db.query(query, values);

        const countQuery = `
    SELECT COUNT(*) AS total
    FROM salary_requests sr
    JOIN employees e ON e.id = sr.employee_id
    ${whereClause}
  `;

        const { rows: countRows } = await db.query(countQuery, values.slice(0, values.length - 2));

        return {
            data: rows,
            total: Number(countRows[0].total)
        };

    }

    async getRequestById(id) {

        const { rows } = await db.query(`
    SELECT
      sr.id,
      sr.requested_amount AS amount,
      sr.status,
      sr.created_at AS requestDate,
      sr.full_name,
      sr.phone_number,
      sr.payment_method,
      sr.note,
      sr.adjustment_type,
      sr.adjustment_amount,
      gsr.name as salary_request_branch,
      u.first_name || ' ' || u.last_name AS employeeName,
      u.phone,

      r.name AS role,
      g.name AS branch

    FROM salary_requests sr

    JOIN employees e
      ON e.id = sr.employee_id

    JOIN users u
      ON u.id = e.user_id

    JOIN roles r
      ON r.id = u.role_id

    JOIN branches b
      ON b.id =  e.branch_id

    LEFT JOIN branches bsr
      ON bsr.id = sr.branch_id
    
    LEFT JOIN governorates AS gsr
      ON gsr.id = bsr.governorate_id

    JOIN governorates g
      ON g.id = b.governorate_id

    WHERE sr.id = $1
  `, [id]);

        return rows[0] || null;

    }
    async getRequestTransactions(requestId) {

        const { rows } = await db.query(`
    SELECT
      wt.id,
      wt.amount,
      wt.order_id,
      wt.created_at,

      o.total_main_price,
      o.total_sold_price

    FROM salary_request_transactions srt

    JOIN wallet_transactions wt
      ON wt.id = srt.transaction_id

    LEFT JOIN orders o
      ON o.id = wt.order_id

    WHERE srt.salary_request_id = $1
  `, [requestId]);

        return rows;

    }
    async removeTransactionFromRequest(client, requestId, transactionId) {

        await client.query(`
    DELETE FROM salary_request_transactions
    WHERE salary_request_id = $1
    AND transaction_id = $2
  `, [requestId, transactionId]);

    }
    async updateTransactionType(client, transactionId, type) {

        await client.query(`
    UPDATE wallet_transactions
    SET type = $2
    WHERE id = $1
  `, [transactionId, type]);

    }

    async updateRequestAmount(client, requestId, amount) {

        await client.query(`
    UPDATE salary_requests
    SET requested_amount = $2
    WHERE id = $1
  `, [requestId, amount]);

    }

    async getPendingByEmployeeId(employeeId) {
        const { rows } = await db.query(`
            SELECT id, requested_amount
            FROM salary_requests
            WHERE employee_id = $1
            AND status = 'PENDING'
        `, [employeeId]);
        return rows;
    }

    async bulkUpdateStatus(ids, status, client) {
        await client.query(
            `
            UPDATE salary_requests
            SET status = $1
            WHERE id = ANY($2)
            `,
            [status, ids]
        );
    }


}

module.exports = new SalaryRequestRepository();
