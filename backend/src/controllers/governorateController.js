const governorateService = require('../services/governorateService');

class GovernorateController {

    create = async (req, res) => {

        try {

            const { name } = req.body || {};

            const result = await governorateService.createGovernorate({ name });

            res.status(201).json({
                success: true,
                body: result,
                message: "تم إنشاء المحافظة"
            });

        } catch (err) {

            res.status(400).json({
                success: false,
                message: err.message
            });

        }

    }

    update = async (req, res) => {

        try {

            const { id } = req.params;
            const { name } = req.body || {};

            const result = await governorateService.updateGovernorate({
                id,
                name
            });

            res.json({
                success: true,
                body: result,
                message: "تم تعديل المحافظة"
            });

        } catch (err) {

            res.status(400).json({
                success: false,
                message: err.message
            });

        }

    }

    delete = async (req, res) => {

        try {

            const { id } = req.params;

            const result = await governorateService.deleteGovernorate(id);

            res.json({
                success: true,
                body: result,
                message: "تم حذف المحافظة"
            });

        } catch (err) {

            res.status(400).json({
                success: false,
                message: err.message
            });

        }

    }

    list = async (req, res) => {

        try {

            const { page, limit } = req.query;

            const result = await governorateService.listGovernorates({
                page,
                limit
            });

            res.json({
                success: true,
                body: result,
                message: "تم جلب المحافظات"
            });

        } catch (err) {

            res.status(400).json({
                success: false,
                message: err.message
            });

        }

    }

}

module.exports = new GovernorateController();