const { randomUUID } = require('crypto');
const db = require('../helpers/DBHelper')

class OrderCommissionRepository {

    async create(data) {

        await db.query(`
      INSERT INTO order_commissions
      (id, order_id, company_amount, general_supervisor_amount, supervisor_amount, marketer_amount)

      VALUES ($1,$2,$3,$4,$5,$6)
    `, [
            randomUUID(),
            data.order_id,
            data.company,
            data.gs,
            data.supervisor,
            data.marketer
        ]);

    }

}

module.exports = new OrderCommissionRepository();