const db = require('../helpers/DBHelper');
const { randomUUID } = require('crypto');
const salaryRepo = require('../data/salaryRequestRepository');
const TYPES = require('../utils/walletTransactionTypes');
const STATUS = require('../utils/salaryRequestStatus');
const PAYMENT_METHODS = require('../utils/salaryRequestPaymentMethods');
const employeeRepo = require('../data/employeeRepository');
const adminRepo = require('../data/adminRepository');
const branchRepo = require('../data/branchRepository');
const notificationHelper = require("../helpers/notificationHelper");

class SalaryRequestService {

    async createSalaryRequest(user, payload = {}) {
        return db.runInTransaction(async (client) => {
            const employee = await employeeRepo.findByUserId(user.id);
            if (!employee) throw new Error('Employee record not found');

            const details = this._validateAndNormalizeSalaryRequestDetails(payload);

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

            const request = await salaryRepo.create(client, employee.id, totalAmount, details);
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

    _validateAndNormalizeSalaryRequestDetails(payload) {
        const raw = payload || {};

        const full_name = String(raw.full_name || '').trim();
        const phone_number = String(raw.phone_number || '').trim();
        const address = String(raw.address || '').trim();
        const payment_method = String(raw.payment_method || '').trim();
        const note = raw.note === undefined || raw.note === null ? null : String(raw.note);

        if (!full_name) throw new Error('الاسم  الكامل مطلوب');
        if (!phone_number) throw new Error('الرقم الموبايل مطلوب');
        if (!address) throw new Error('العنوان مطلوب');
        if (!payment_method) throw new Error('الريقة الدفع مطلوبة');

        const allowed = new Set(Object.values(PAYMENT_METHODS));
        if (!allowed.has(payment_method)) {
            throw new Error(`طريقة دفع غير صالحة: ${payment_method}`);
        }

        return { full_name, phone_number, address, payment_method, note };
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

    async approveRequest(requestId, adjustmentType = 'BONUS', adjustmentAmount = 0) {
        return db.runInTransaction(async (client) => {
            const request = await salaryRepo.findById(requestId);
            if (!request) throw new Error('Salary request not found');
            if (request.status !== STATUS.PENDING) {
                throw new Error('Salary request status is not pending');
            }

            if (adjustmentType === 'DISCOUNT' && Number(adjustmentAmount) > Number(request.amount)) {
                throw new Error('مبلغ الخصم لا يمكن أن يكون أكبر من مبلغ طلب الراتب');
            }

            const transactions = await salaryRepo.getRequestTransactions(requestId);
            const ids = transactions.map(t => t.id);

            if (ids.length > 0) {
                await salaryRepo.updateTransactionsType(client, ids, TYPES.WITHDREW);
            }

            // Save the adjustment details to the request and set status to APPROVED
            await salaryRepo.updateStatus(client, requestId, STATUS.APPROVED, adjustmentType, adjustmentAmount);

            // If there's an adjustment amount, create the corresponding wallet transaction
            if (Number(adjustmentAmount) > 0) {
                const txId = randomUUID();
                await client.query(`
                    INSERT INTO wallet_transactions (id, employee_id, amount, type)
                    VALUES ($1, $2, $3, $4)
                `, [txId, request.employee_id || request.employeeId, adjustmentAmount, adjustmentType]);

                // Link the new adjustment transaction to the salary request
                await salaryRepo.attachTransactions(client, requestId, [txId]);
            }

            // Notify employee (Robust)
            try {
                const employee = await employeeRepo.findById(request.employee_id || request.employeeId);
                if (employee && employee.user_id) {
                    let msg = `تمت الموافقة على طلب الراتب الخاص بك بنجاح.`;
                    if (Number(adjustmentAmount) > 0) {
                        if (adjustmentType === 'BONUS') {
                            msg = `تمت الموافقة على طلب الراتب الخاص بك بنجاح مع إضافة مكافأة بقيمة ${adjustmentAmount}.`;
                        } else if (adjustmentType === 'DISCOUNT') {
                            msg = `تمت الموافقة على طلب الراتب الخاص بك بنجاح مع تطبيق خصم بقيمة ${adjustmentAmount}.`;
                        }
                    }
                    await notificationHelper.notify(employee.user_id, 'تمت الموافقة على طلب الراتب', msg);
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

    async listPaginated(user, page = 1, limit = 20, status = null, paymentMethod = null) {
        const offset = (page - 1) * limit;
        const employee = await employeeRepo.findByUserId(user.id);

        if (paymentMethod && paymentMethod !== 'ALL') {
            const allowed = new Set(Object.values(PAYMENT_METHODS));
            if (!allowed.has(String(paymentMethod))) {
                throw new Error(`Invalid payment_method: ${paymentMethod}`);
            }
        }

        const result = await salaryRepo.listPaginated({
            limit,
            offset,
            role: user.role,
            employeeId: employee ? employee.id : null,
            branchId: employee ? employee.branch_id : null,
            status,
            paymentMethod
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
