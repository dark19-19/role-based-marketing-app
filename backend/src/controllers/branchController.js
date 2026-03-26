const branchService = require('../services/branchService');

class BranchController {

    create = async (req, res) => {

        try {

            const { governorate_id } = req.body || {};

            const result = await branchService.createBranch({
                governorate_id
            });

            res.status(201).json({
                success: true,
                body: result,
                message: "تم إنشاء الفرع بنجاح"
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
            const { governorate_id } = req.body || {};

            const result = await branchService.updateBranch({
                id,
                governorate_id
            });

            res.json({
                success: true,
                body: result,
                message: "تم تعديل الفرع"
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

            const result = await branchService.deleteBranch(id);

            res.json({
                success: true,
                body: result,
                message: "تم حذف الفرع"
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

            const result = await branchService.listBranches({
                page,
                limit
            });

            res.json({
                success: true,
                body: result,
                message: "تم جلب الفروع"
            });

        } catch (err) {

            res.status(400).json({
                success: false,
                message: err.message
            });

        }

    }

    getById = async (req, res) => {

        try {

            const { id } = req.params;

            const result = await branchService.getBranchDetails(id);

            res.json({
                success: true,
                body: result,
                message: "تم جلب تفاصيل الفرع"
            });

        } catch (err) {

            res.status(400).json({
                success: false,
                message: err.message
            });

        }

    }

}

module.exports = new BranchController();