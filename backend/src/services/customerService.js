const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');

const roleRepository = require('../data/roleRepository');
const userRepository = require('../data/userRepository');
const employeeRepository = require('../data/employeeRepository');
const customerRepository = require('../data/customerRepository');

class CustomerService {

    async createCustomerByEmployee(userId, payload) {

        const employee = await employeeRepository.findByUserId(userId);

        if (!employee) {
            throw new Error('Employee not found');
        }

        const role = await roleRepository.findByName('CUSTOMER');

        const passwordHash = await bcrypt.hash(payload.password, 10);
        console.log(passwordHash);
        console.log(payload.password)

        const newUserId = randomUUID();

        await userRepository.createUser(
            {
                id: newUserId,
                first_name: payload.first_name,
                last_name: payload.last_name,
                phone: payload.phone,
                passwordHash: passwordHash,
                role_id: role.id
            }
        );

        const customerId = await customerRepository.create(
            {
                user_id: newUserId,
                referred_by: employee.id,
                first_marketer_id: employee.id,
                governorate_id: payload.governorate_id
            }
        );

        return customerId;

    }

    async listCustomers(query) {

        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 20;

        const result = await customerRepository.listPaginated({
            page,
            limit
        });

        const pages = Math.ceil(result.total / limit);

        return {
            data: result.data,
            pagination: {
                total: result.total,
                page,
                limit,
                pages
            }
        };

    }

}

module.exports = new CustomerService();