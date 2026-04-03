const db = require('../helpers/DBHelper');
const commissionService = require('../services/commissionService');

class CommissionController {

    async create(req, res) {

        try {

            const id = await db.runInTransaction(async () => {
                return await commissionService.create(req.body);
            });

            res.json({success: true, data: {id}});

        } catch (err) {
            res.status(400).json({success: false, message: err.message});
        }

    }

    async update(req, res) {

        try {

            await db.runInTransaction(async () => {
                await commissionService.update(req.params.id, req.body);
            });

            res.json({success: true});

        } catch (err) {
            res.status(400).json({success: false, message: err.message});
        }

    }

    async delete(req, res) {

        try {

            await db.runInTransaction(async () => {
                await commissionService.delete(req.params.id);
            });

            res.json({success: true});

        } catch (err) {
            res.status(400).json({success: false, message: err.message});
        }

    }

    async getById(req, res) {

        try {

            const data = await commissionService.getById(req.params.id);

            res.json({success: true, data});

        } catch (err) {
            res.status(404).json({success: false, message: err.message});
        }

    }

    async list(req, res) {

        try {

            const result = await commissionService.list(req.query);

            res.json({success: true, data: result});

        } catch (err) {
            res.status(500).json({success: false});
        }

    }

}

module.exports = new CommissionController();