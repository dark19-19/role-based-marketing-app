const db = require('../helpers/DBHelper');
const customerService = require('../services/customerService');

class CustomerController {

    async create(req, res) {

        try {

            const userId = req.user.id;

            const customerId = await db.runInTransaction(async () => {

                return await customerService.createCustomerByEmployee(
                    userId,
                    req.body
                );

            });

            return res.json({
                success: true,
                data: { id: customerId }
            });

        } catch (err) {

            console.error(err);

            return res.status(400).json({
                success: false,
                message: err.message
            });

        }

    }

    async list(req, res) {

        try {

            const result = await customerService.listCustomers(req.query);

            return res.json({
                success: true,
                data: result
            });

        } catch (err) {

            console.error(err);

            return res.status(500).json({
                success: false,
                message: 'Server error'
            });

        }

    }

}

module.exports = new CustomerController();