const walletRepo = require('../data/walletRepository');
const employeeRepo = require('../data/employeeRepository');
const userRepo = require('../data/userRepository');
const db = require('../helpers/DBHelper');
const TYPES = require('../utils/walletTransactionTypes');
const notificationHelper = require('../helpers/notificationHelper');

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

    async adjustEmployeeWallet(adminUser, payload = {}) {
        const employeeId = payload.employee_id || payload.employeeId;
        const rawAmount = payload.amount;
        const type = String(payload.type || '').trim().toUpperCase();

        if (!employeeId) {
            throw new Error('employee_id is required');
        }

        const amount = Number(rawAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error('amount must be a positive number');
        }

        const allowedTypes = new Set([TYPES.BONUS, TYPES.DISCOUNT]);
        if (!allowedTypes.has(type)) {
            throw new Error(`Invalid type: ${type}`);
        }

        const targetEmployee = await employeeRepo.findEmployeeWithRole(employeeId);
        if (!targetEmployee) {
            throw new Error('Employee not found');
        }

        const allowedRoles = new Set(['MARKETER', 'SUPERVISOR', 'GENERAL_SUPERVISOR']);
        if (!allowedRoles.has(targetEmployee.role)) {
            throw new Error(`Unauthorized role: ${targetEmployee.role}`);
        }

        const targetEmployeeRow = await employeeRepo.findById(employeeId);
        const targetUserId = targetEmployeeRow?.user_id || null;
        if (!targetUserId) {
            throw new Error('Employee user not found');
        }

        const adminRow = await userRepo.findById(adminUser.id);
        const adminName = adminRow ? `${adminRow.first_name} ${adminRow.last_name}` : 'Admin';

        return db.runInTransaction(async (client) => {
            if (type === TYPES.DISCOUNT) {
                const summary = await walletRepo.getSummary(employeeId);
                const currentBalance = Number(summary?.current_balance || 0);
                if (amount > currentBalance) {
                    throw new Error('Discount amount cannot be greater than current balance');
                }
            }

            const transactionId = await walletRepo.createWithClient(client, {
                employee_id: employeeId,
                order_id: null,
                amount,
                type,
            });

            try {
                const label = type === TYPES.BONUS ? 'مكافأة' : 'خصم';
                await notificationHelper.notify(
                    targetUserId,
                    'تعديل على المحفظة',
                    `قام ${adminName} بإضافة ${label} بقيمة ${amount}`,
                );
            } catch (notifyErr) {
                console.error("[WalletService] Notification error (ignored):", notifyErr.message);
            }

            return { transactionId };
        });
    }
}

module.exports = new WalletService();
