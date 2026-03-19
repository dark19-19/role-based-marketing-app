const db = require('../helpers/DBHelper');
const orderService = require('../services/orderService');

class OrderController {

    async create(req, res) {

        try {

            const orderId = await db.runInTransaction(async (client) => {

                return await orderService.createOrder(
                    req.user,
                    req.body,
                    client
                );

            });

            return res.json({
                success: true,
                data: { id: orderId }
            });

        } catch (err) {

            console.error(err);

            return res.status(400).json({
                success: false,
                message: err.message
            });

        }

    }
    async approve(req, res) {

        try {

            await db.runInTransaction(async (client) => {

                await orderService.approveOrder(
                    req.user,
                    req.params.id,
                    client
                );

            });

            res.json({ success:true });

        } catch (err) {
            res.status(400).json({ success:false, message:err.message });
        }

    }

    async reject(req, res) {
        try {
            await db.runInTransaction(async (client) => {
                await orderService.rejectOrder(
                    req.user,
                    req.params.id,
                    client
                )
            })
        } catch (err) {
            res.status(400).json({success:false, message:err.message});
        }
    }

    async list(req, res) {

        try {

            const result = await orderService.list(req.user, req.query);

            res.json({
                success: true,
                body: result,
                message: "تم جلب الطلبات بنجاح"
            });

        } catch (err) {
            res.status(400).json({
                success: false,
                message: err.message
            });
        }

    }

    async getById(req, res) {

        try {

            const result = await orderService.getById(req.params.id);

            res.json({
                success: true,
                body: result,
                message: "تم جلب تفاصيل الطلب بنجاح"
            });

        } catch (err) {
            res.status(404).json({
                success: false,
                message: err.message
            });
        }

    }

}

module.exports = new OrderController();