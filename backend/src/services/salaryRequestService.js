const salaryRequestRepo = require('../data/salaryRequestRepository');

class SalaryRequestService {

    async createRequest({ employeeId, requestedAmount }) {
        try {
            if (!requestedAmount || requestedAmount <= 0) {
                throw new Error('يجب أن يكون المبلغ المطلوب أكبر من صفر');
            }

            const id = await salaryRequestRepo.create({
                employee_id: employeeId,
                requested_amount: requestedAmount,
                status: 'PENDING'
            });

            return { id };

        } catch (err) {
            throw err;
        }
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