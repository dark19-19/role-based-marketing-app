const salaryService = require('../services/salaryRequestService')

class SalaryRequestController {
    async getDetails(req, res) {

        try {

            const data =
                await salaryService.getRequestDetails(req.params.id);

            res.json({
                success: true,
                data
            });

        } catch (err) {

            res.status(404).json({
                success: false,
                message: err.message
            });

        }

    }

    async removeTransaction(req, res) {

        try {

            const { transactionId } = req.body;

            const result =
                await salaryService.updateRequestRemoveTransaction(
                    req.params.id,
                    transactionId
                );

            res.json({
                success: true,
                data: result
            });

        } catch (err) {

            res.status(400).json({
                success: false,
                message: err.message
            });

        }

    }

    async list(req, res) {

        try {

            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 20;

            const result = await salaryService.listPaginated(
                req.user,
                page,
                limit
            );

            res.json({
                success: true,
                data: result
            });

        } catch (err) {

            res.status(500).json({
                success: false,
                message: err.message
            });

        }

    }

    async create(req, res) {
        try {
            const result = await salaryService.createSalaryRequest(req.user)
            res.status(201).json({
                success: true,
                data: result
            })
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            })
        }
    }

    async approve(req, res) {
        try {
            const id = req.params.id;
            await salaryService.approveRequest(id);

            res.status(200).json({
                success: true
            })
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            })
        }
    }

    async reject(req, res) {
        try {
            const id = req.params.id;
            await salaryService.rejectRequest(id);
            res.status(200).json({
                success: true
            })
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            })
        }
    }

}

module.exports = new SalaryRequestController();