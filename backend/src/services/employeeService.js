const { randomUUID } = require('crypto');
const employeeRepo = require('../data/employeeRepository');
const salaryRequestRepo = require('../data/salaryRequestRepository');

class EmployeeService {

    async createEmployee({
                             userId,
                             role,
                             branchId,
                             supervisorId
                         }) {

        try {

            let finalSupervisor = null;

            // Branch Manager
            if (role === 'BRANCH_MANAGER') {
                finalSupervisor = null;
            }

            // General Supervisor
            if (role === 'GENERAL_SUPERVISOR') {
                finalSupervisor = null;
            }

            // Supervisor
            if (role === 'SUPERVISOR') {

                if (!supervisorId) {
                    throw new Error('يجب تحديد المشرف العام');
                }

                const supervisor =
                    await employeeRepo.findEmployeeWithRole(supervisorId);

                if (!supervisor) {
                    throw new Error('المشرف غير موجود');
                }

                if (supervisor.role !== 'GENERAL_SUPERVISOR') {
                    throw new Error('المشرف يجب أن يكون مشرفاً عاماً');
                }

                finalSupervisor = supervisorId;
            }

            // Marketer
            if (role === 'MARKETER') {

                if (!supervisorId) {
                    throw new Error('يجب تحديد المشرف');
                }

                const supervisor =
                    await employeeRepo.findEmployeeWithRole(supervisorId);

                if (!supervisor) {
                    throw new Error('المشرف غير موجود');
                }

                if (
                    supervisor.role !== 'SUPERVISOR' &&
                    supervisor.role !== 'GENERAL_SUPERVISOR'
                ) {
                    throw new Error(
                        'المشرف يجب أن يكون مشرفاً أو مشرفاً عاماً'
                    );
                }

                finalSupervisor = supervisorId;
            }

            const id = randomUUID();

            await employeeRepo.create({
                id,
                userId,
                branchId,
                supervisorId: finalSupervisor
            });

            return { id };

        } catch (err) {
            throw err;
        }

    }

    async listEmployees ({limit, page}) {
        try {
            page = Number(page);
            limit = Number(limit);

            const offset = (page - 1) * limit;

            const employees = await employeeRepo.getEmployees({limit, offset});

            const total = await employeeRepo.count()

            return {
                data: employees,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            }
        } catch (err) {
            throw err;
        }

    }

    async getEmployeeDetails(employeeId) {
        try {
            // Get basic employee info
            const employee = await employeeRepo.getEmployeeDetails(employeeId);

            if (!employee) {
                throw new Error('الموظف غير موجود');
            }

            // Get supervisor
            const supervisor = await employeeRepo.getEmployeeSupervisor(employeeId);

            // Get general supervisor
            const generalSupervisor = await employeeRepo.getEmployeeGeneralSupervisor(employeeId);

            // Get orders
            const orders = await employeeRepo.getEmployeeOrders(employeeId);

            // Get order count
            const orderCount = await employeeRepo.getEmployeeOrdersCount(employeeId);

            // Get customers (referred by this employee)
            const customers = await employeeRepo.getEmployeeCustomers(employeeId);

            // Get salary (sum of wallet transactions)
            const salary = await employeeRepo.getEmployeeSalarySum(employeeId);

            // Get salary requests
            const salaryRequests = await salaryRequestRepo.findByEmployeeId(employeeId);

            return {
                // Employee basic info
                id: employee.id,
                full_name: `${employee.first_name} ${employee.last_name}`,
                phone: employee.phone,
                is_active: employee.is_active,
                created_at: employee.created_at,

                // Branch info
                branch: {
                    id: employee.branch_id,
                    governorate: employee.branch_governorate
                },

                // Role
                role: employee.role,

                // Supervisor info
                supervisor: supervisor && supervisor.id ? {
                    id: supervisor.id,
                    name: supervisor.supervisor_name,
                    role: supervisor.supervisor_role
                } : null,

                // General supervisor info
                general_supervisor: generalSupervisor && generalSupervisor.id ? {
                    id: generalSupervisor.id,
                    name: generalSupervisor.general_supervisor_name,
                    role: generalSupervisor.general_supervisor_role
                } : null,

                // Order stats
                orderCount,

                // Orders list
                orders: orders.map(order => ({
                    id: order.id,
                    status: order.status,
                    total_main_price: order.total_main_price,
                    total_sold_price: order.total_sold_price,
                    created_at: order.created_at,
                    customer: order.customer_id ? {
                        id: order.customer_id,
                        name: order.customer_name,
                        phone: order.customer_phone,
                        governorate: order.governorate
                    } : null
                })),

                // Salary
                salary,

                // Customers
                customers: customers.map(customer => ({
                    id: customer.id,
                    name: customer.customer_name,
                    phone: customer.phone,
                    isActive: customer.is_active,
                    governorate: customer.governorate,
                    createdAt: customer.created_at
                })),

                // Salary requests
                salary_requests: salaryRequests.map(request => ({
                    id: request.id,
                    requested_amount: request.requested_amount,
                    status: request.status,
                    created_at: request.created_at
                }))
            };

        } catch (err) {
            throw err;
        }
    }

}

module.exports = new EmployeeService();