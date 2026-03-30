const walletService = require('../services/walletService');

class WalletController {
    async getSummary(req, res) {
        try {
            const result = await walletService.getSummary(req.user);
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
