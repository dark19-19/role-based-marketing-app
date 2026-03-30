const walletRepo = require('../data/walletRepository');
const employeeRepo = require('../data/employeeRepository');

class WalletService {
    async getSummary(user) {
        try {
            const employee = await employeeRepo.findByUserId(user.id);
            // للأدمن أو أي حساب ليس له سجل موظف، نعيد أصفاراً بدلاً من خطأ
            if (!employee) {
                return {
                    currentBalance: 0,
                    totalEarned: 0,
                    totalWithdrawn: 0,
                    pendingRequestsTotal: 0
                };
            }
            return await walletRepo.getSummary(employee.id);
        } catch (error) {
            console.error("WalletService getSummary Error:", error);
            throw error;
        }
    }

    async getTransactions(user) {
        try {
            const employee = await employeeRepo.findByUserId(user.id);
            // للأدمن أو أي حساب ليس له سجل موظف، نعيد مصفوفة فارغة بدلاً من خطأ
            if (!employee) {
                return [];
            }
            return await walletRepo.getTransactions(employee.id);
        } catch (error) {
            console.error("WalletService getTransactions Error:", error);
            throw error;
        }
    }
}

module.exports = new WalletService();
