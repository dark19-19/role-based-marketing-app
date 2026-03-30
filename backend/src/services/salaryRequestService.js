const db = require('../helpers/DBHelper');
const salaryRepo = require('../data/salaryRequestRepository');
const TYPES = require('../utils/walletTransactionTypes');
const STATUS = require('../utils/salaryRequestStatus');
const employeeRepo = require('../data/employeeRepository');
const adminRepo = require('../data/adminRepository');
const branchRepo = require('../data/branchRepository');
const notificationHelper = require("../helpers/notificationHelper");

class SalaryRequestService {

    async createSalaryRequest(user) {
        return db.runInTransaction(async (client) => {
            const employee = await employeeRepo.findByUserId(user.id);
            if (!employee) throw new Error('Employee record not found');

            const transactions = await salaryRepo.getEmployeeBalanceTransactions(employee.id);
            
            if (transactions.length === 0)
                throw new Error('No balance transactions available for withdrawal');

            let totalAmount = 0;
            transactions.forEach(t => {
                const val = Number(t.amount);
                totalAmount += isNaN(val) ? 0 : val;
            });

            if (totalAmount <= 0) {
               throw new Error('Calculated withdrawal amount must be greater than 0');
            }

            const request = await salaryRepo.create(client, employee.id, totalAmount);
            const ids = transactions.map(t => t.id);

            await salaryRepo.attachTransactions(client, request.id, ids);
            await salaryRepo.updateTransactionsType(client, ids, TYPES.REQUESTED);

            // Robust notification block
            try {
                const company = await adminRepo.getCompanyAccount();
                if (company && company.user_id) {
                    await notificationHelper.notify(company.user_id, 'طلب راتب جديد', `تم استقبال طلب راتب جديد بقيمة ${totalAmount}، يرجى مراجعة طلبات الرواتب.`);
                }

                const branchManager = await branchRepo.getBranchManager(employee.branch_id);
                if (branchManager && branchManager.user_id) {
                    await notificationHelper.notify(branchManager.user_id, 'طلب راتب جديد', `تم استقبال طلب راتب جديد بقيمة ${totalAmount} لأحد الموظفين في فرعك.`);
                }
            } catch (notifyErr) {
                console.error("[SalaryRequestService] Notification logic error (ignored):", notifyErr.message);
            }

            return request;
        });
    }

    async getRequestDetails(requestId) {
        const request = await salaryRepo.getRequestById(requestId);
        if (!request) throw new Error('Salary request not found');

        const transactions = await salaryRepo.getRequestTransactions(requestId);
        return {
            ...request,
            transactions
        };
    }

    async approveRequest(requestId) {
        return db.runInTransaction(async (client) => {
            const transactions = await salaryRepo.getRequestTransactions(requestId);
            const ids = transactions.map(t => t.id);

            if (ids.length > 0) {
                await salaryRepo.updateTransactionsType(client, ids, TYPES.WITHDREW);
            }

            await salaryRepo.updateStatus(client, requestId, STATUS.APPROVED);

            // Notify employee (Robust)
            try {
                const request = await salaryRepo.getRequestById(requestId);
                if (request) {
                    const employee = await employeeRepo.findById(request.employee_id || request.employeeId);
                    if (employee && employee.user_id) {
                        await notificationHelper.notify(employee.user_id, 'تمت الموافقة على طلب الراتب', `تمت الموافقة على طلب الراتب الخاص بك بنجاح.`);
                    }
                }
            } catch (notifyErr) {
                console.error("[SalaryRequestService] Approval notification error (ignored):", notifyErr.message);
            }
            
            return { success: true };
        });
    }

    async rejectRequest(requestId) {
        return db.runInTransaction(async (client) => {
            const transactions = await salaryRepo.getRequestTransactions(requestId);
            const ids = transactions.map(t => t.id);

            if (ids.length > 0) {
                await salaryRepo.updateTransactionsType(client, ids, TYPES.BALANCE);
            }

            await salaryRepo.updateStatus(client, requestId, STATUS.REJECTED);

            // Notify employee (Robust)
            try {
                const request = await salaryRepo.getRequestById(requestId);
                if (request) {
                    const employee = await employeeRepo.findById(request.employee_id || request.employeeId);
                    if (employee && employee.user_id) {
                        await notificationHelper.notify(employee.user_id, 'تم رفض طلب الراتب', `تم مع الأسف رفض طلب الراتب الخاص بك. يرجى مراجعة الإدارة.`);
                    }
                }
            } catch (notifyErr) {
                console.error("[SalaryRequestService] Rejection notification error (ignored):", notifyErr.message);
            }

            return { success: true };
        });
    }

    async listPaginated(user, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const employee = await employeeRepo.findByUserId(user.id);

        const result = await salaryRepo.listPaginated({
            limit,
            offset,
            role: user.role,
            employeeId: employee ? employee.id : null,
            branchId: employee ? employee.branch_id : null
        });

        return {
            data: result.data,
            pagination: {
                total: result.total,
                page,
                limit,
                pages: Math.ceil(result.total / limit)
            }
        };
    }
}

module.exports = new SalaryRequestService();