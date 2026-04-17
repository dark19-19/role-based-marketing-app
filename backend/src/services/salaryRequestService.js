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
            const request = await salaryRepo.findById(requestId);
            if (!request) throw new Error('Salary request not found');
            if (request.status !== STATUS.PENDING) {
                throw new Error('Salary request status is not pending');
            }

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
            const request = await salaryRepo.findById(requestId);
            if (!request) throw new Error('Salary request not found');
            if (request.status !== STATUS.PENDING) {
                throw new Error('Salary request status is not pending');
            }

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

    async listPaginated(user, page = 1, limit = 20, status = null) {
        const offset = (page - 1) * limit;
        const employee = await employeeRepo.findByUserId(user.id);

        const result = await salaryRepo.listPaginated({
            limit,
            offset,
            role: user.role,
            employeeId: employee ? employee.id : null,
            branchId: employee ? employee.branch_id : null,
            status
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

    async updateRequestRemoveTransaction(requestId, transactionId) {
        return db.runInTransaction(async (client) => {
            // Get the request details
            const request = await salaryRepo.findById(requestId);
            if (!request) {
                throw new Error('Salary request not found');
            }

            // Check if request is still pending
            if (request.status !== STATUS.PENDING) {
                throw new Error('Can only remove transactions from pending requests');
            }

            // Get the transaction details
            const transactions = await salaryRepo.getRequestTransactions(requestId);
            if (transactions.length === 0) {
                throw new Error('Request has no transactions');
            }
            const transaction = transactions.find(t => t.id === transactionId);
            
            if (!transaction) {
                throw new Error('Transaction not found in this request');
            }

            // Remove the transaction from the salary_request_transactions table
            await salaryRepo.removeTransactionFromRequest(client, requestId, transactionId);

            // Update the wallet transaction type back to BALANCE
            await salaryRepo.updateTransactionType(client, transactionId, TYPES.BALANCE);

            // Recalculate the request amount
            const remainingTransactions = transactions.filter(t => t.id !== transactionId);
            const newAmount = remainingTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

            // If no transactions remain, reject the request automatically
            if (remainingTransactions.length === 0) {
                await salaryRepo.updateStatus(client, requestId, STATUS.REJECTED);
                
                // Notify the employee
                try {
                    const employee = await employeeRepo.findById(request.employee_id);
                    if (employee && employee.user_id) {
                        await notificationHelper.notify(
                            employee.user_id,
                            'تم إلغاء طلب الراتب',
                            'تم إلغاء طلب راتبك تلقائياً لأن جميع المعاملات المالية تمت إزالتها.'
                        );
                    }
                } catch (notifyErr) {
                    console.error("[SalaryRequestService] Notification error (ignored):", notifyErr.message);
                }

                return {
                    success: true,
                    message: 'Request rejected as no transactions remain',
                    newAmount: 0
                };
            }

            // Update the request amount
            await salaryRepo.updateRequestAmount(client, requestId, newAmount);

            // Notify the employee
            try {
                const employee = await employeeRepo.findById(request.employee_id);
                if (employee && employee.user_id) {
                    await notificationHelper.notify(
                        employee.user_id,
                        'تم تعديل طلب الراتب',
                        `تم إزالة مبلغ ${Number(transaction.amount)} من طلب راتبك. المبلغ الجديد: ${newAmount}`
                    );
                }
            } catch (notifyErr) {
                console.error("[SalaryRequestService] Notification error (ignored):", notifyErr.message);
            }

            return {
                success: true,
                message: 'Transaction removed successfully',
                newAmount
            };
        });
    }
}

module.exports = new SalaryRequestService();
