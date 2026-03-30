const db = require('../helpers/DBHelper');
const salaryRepo = require('../data/salaryRequestRepository');
const TYPES = require('../utils/walletTransactionTypes');
const STATUS = require('../utils/salaryRequestStatus');
const employeeRepo = require('../data/employeeRepository');
const adminRepo = require('../data/adminRepository');
const branchRepo = require('../data/branchRepository');
const notificationHelper = require("../helpers/notificationHelper");
const employeeRepository = require("../data/employeeRepository");
class SalaryRequestService {

    async createSalaryRequest(user){
        return db.runInTransaction(async(client)=>{
            const employee = await employeeRepo.findByUserId(user.id)

            const transactions =
                await salaryRepo.getEmployeeBalanceTransactions(employee.id);
            if(transactions.length === 0)
                throw new Error('No balance transactions');

            const amount = transactions.reduce(
                (sum,t)=>sum + Number(t.amount),0
            );

            const request =
                await salaryRepo.create(client,employee.id,amount);

            const ids = transactions.map(t=>t.id);

            await salaryRepo.attachTransactions(
                client,
                request.id,
                ids
            );

            await salaryRepo.updateTransactionsType(
                client,
                ids,
                TYPES.REQUESTED
            );

            const company = await adminRepo.getCompanyAccount()
            const companyUserId = company.user_id;
            const branchManager = await branchRepo.getBranchManager(employee.branch_id);
            const branchManagerUserId = branchManager.user_id;
            await notificationHelper.notify(companyUserId, 'طلب راتب جديد', `تم استقبال طلب راتب جديد، يرجى مراجعة طلبات الرواتب لمعرفة التفاصيل.`)
            await notificationHelper.notify(branchManagerUserId, 'طلب راتب جديد', `تم استقبال طلب راتب جديد، يرجى مراجعة طلبات الرواتب لمعرفة التفاصيل.`)



            return request;

        });

    }
    async getRequestDetails(requestId) {

        const request = await salaryRepo.getRequestById(requestId);

        if (!request)
            throw new Error('Salary request not found');

        const transactions =
            await salaryRepo.getRequestTransactions(requestId);

        return {
            ...request,
            transactions
        };

    }

    async updateRequestRemoveTransaction(requestId, transactionId) {

        return db.runInTransaction(async (client) => {

            const transactions =
                await salaryRepo.getRequestTransactions(requestId);

            const exists =
                transactions.find(t => t.id === transactionId);

            if (!exists)
                throw new Error('Transaction not in this request');

            // remove relation
            await salaryRepo.removeTransactionFromRequest(
                client,
                requestId,
                transactionId
            );

            // return money to balance
            await salaryRepo.updateTransactionType(
                client,
                transactionId,
                TYPES.BALANCE
            );

            // recalc amount
            const remaining = transactions
                .filter(t => t.id !== transactionId);

            const newAmount =
                remaining.reduce((sum, t) => sum + Number(t.amount), 0);

            await salaryRepo.updateRequestAmount(
                client,
                requestId,
                newAmount
            );

            return {
                newAmount
            };

        });

    }

    async approveRequest(requestId){
        try {

            return db.runInTransaction(async(client)=>{

                const transactions =
                    await salaryRepo.getRequestTransactions(requestId);

                const ids = transactions.map(t=>t.id);
                await salaryRepo.updateTransactionsType(
                    client,
                    ids,
                    TYPES.WITHDREW
                );


                await salaryRepo.updateStatus(
                    requestId,
                    STATUS.APPROVED
                );

                const request = await salaryRepo.getRequestById(requestId);
                const employee = await employeeRepo.findById(request.employee_id);
                const user_id = employee.user_id;
                await notificationHelper.notify(user_id, 'تمت الموافقة على طلب الراتب', `تمت الموافقة على طلب الراتب الخاص بك وتم تحويل المبلغ بنجاح.`)
            });


        } catch (error) {
            throw new Error(error);
        }

    }

    async rejectRequest(requestId){

        return db.runInTransaction(async(client)=>{

            const transactions =
                await salaryRepo.getRequestTransactions(requestId);

            const ids = transactions.map(t=>t.id);

            await salaryRepo.updateTransactionsType(
                client,
                ids,
                TYPES.BALANCE
            );

            await salaryRepo.updateStatus(
                requestId,
                STATUS.REJECTED
            );

            const request = await salaryRepo.getRequestById(requestId);
            const employee = await employeeRepo.findById(request.employee_id);
            const user_id = employee.user_id;
            await notificationHelper.notify(user_id, 'تم رفض طلب الراتب', `تم رفض طلب الراتب الخاص بك. يرجى التواصل مع الإدارة لمعرفة المزيد من التفاصيل.`)

        });

    }

    async listPaginated(user, page = 1, limit = 20) {

        const offset = (page - 1) * limit;
        const employee = await employeeRepo.findByUserId(user.id)

        const result = await salaryRepo.listPaginated({
            limit,
            offset,
            role: user.role,
            employeeId: employee.id,
            branchId: employee.branch_id
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

    async getRequestsByEmployee(employeeId) {
        try {
            const requests = await salaryRequestRepo.findByEmployeeId(employeeId);
            return requests;
        } catch (err) {
            throw err;
        }
    }

    async updateRequestStatus(requestId, status) {
        try {
            const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];

            if (!validStatuses.includes(status)) {
                throw new Error('حالة غير صالحة');
            }

            const request = await salaryRequestRepo.findById(requestId);

            if (!request) {
                throw new Error('الطلب غير موجود');
            }

            await salaryRequestRepo.updateStatus(requestId, status);

            return { id: requestId, status };

        } catch (err) {
            throw err;
        }
    }

}

module.exports = new SalaryRequestService();