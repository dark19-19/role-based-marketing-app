const walletService = require('../services/walletService');

class WalletController {
    async getSummary(req, res) {
        try {
            let targetUser = req.user;
            if (req.user.role === 'ADMIN' || "BRANCH_MANAGER" || "GENERAL_SUPERVISOR" || "SUPERVISOR" && req.query.userId) {
                targetUser = { id: req.query.userId };
            }
            const result = await walletService.getSummary(targetUser);
            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getTransactions(req, res) {
        try {
            const result = await walletService.getTransactions(req.user);
            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new WalletController();
