const { randomUUID } = require('crypto');
const employeeRepo = require('../data/employeeRepository');

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

}

module.exports = new EmployeeService();