const employeeService = require('../services/employeeService');
const salaryRequestService = require('../services/salaryRequestService');

class EmployeeController {

    create = async (req, res) => {
        try {
            const { userId, role, branchId, supervisorId } = req.body || {};

            const result = await employeeService.createEmployee({
                userId,
                role,
                branchId,
                supervisorId
            });

            res.status(201).json({
                success: true,
                body: result,
                message: "تم إنشاء الموظف بنجاح"
            });

        } catch (err) {

            res.status(400).json({
                success: false,
                message: err.message
            });

        }
    }

    list = async (req, res) => {
        try {
            const { page, limit } = req.query;

            const result = await employeeService.listEmployees({
                page,
                limit
            });

            res.json({
                success: true,
                body: result,
                message: "تم جلب قائمة الموظفين"
            });

        } catch (err) {

            res.status(400).json({
                success: false,
                message: err.message
            });

        }
    }

    getDetails = async (req, res) => {
        try {
            const { id } = req.params;

            const result = await employeeService.getEmployeeDetails(id);

            res.json({
                success: true,
                body: result,
                message: "تم جلب تفاصيل الموظف"
            });

        } catch (err) {

            res.status(400).json({
                success: false,
                message: err.message
            });

        }
    }

    createSalaryRequest = async (req, res) => {
        try {
            const { employeeId, requestedAmount } = req.body || {};

            const result = await salaryRequestService.createRequest({
                employeeId,
                requestedAmount
            });

            res.status(201).json({
                success: true,
                body: result,
                message: "تم إنشاء طلب الراتب بنجاح"
            });

        } catch (err) {

            res.status(400).json({
                success: false,
                message: err.message
            });

        }
    }

    getSalaryRequests = async (req, res) => {
        try {
            const { employeeId } = req.params;

            const result = await salaryRequestService.getRequestsByEmployee(employeeId);

            res.json({
                success: true,
                body: result,
                message: "تم جلب طلبات الراتب"
            });

        } catch (err) {

            res.status(400).json({
                success: false,
                message: err.message
            });

        }
    }

    updateSalaryRequestStatus = async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body || {};

            const result = await salaryRequestService.updateRequestStatus(id, status);

            res.json({
                success: true,
                body: result,
                message: "تم تحديث حالة طلب الراتب"
            });

        } catch (err) {

            res.status(400).json({
                success: false,
                message: err.message
            });

        }
    }

}

module.exports = new EmployeeController();