const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');

const roleRepository = require('../data/roleRepository');
const userRepository = require('../data/userRepository');
const employeeRepository = require('../data/employeeRepository');
const customerRepository = require('../data/customerRepository');
const orderRepository = require('../data/orderRepository');

class CustomerService {

    async createCustomerByEmployee(userId, payload) {

        const employee = await employeeRepository.findByUserId(userId);

        if (!employee) {
            throw new Error('Employee not found');
        }

        const existingCustomer = await customerRepository.findByPhoneNumber(payload.phone);
        if (existingCustomer) {
            throw new Error('رقم الهاتف مستخدم مسبقاً');
        }

        const role = await roleRepository.findByName('CUSTOMER');

        const passwordHash = await bcrypt.hash(payload.password, 10);
       

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

    async listCustomers(user, query) {

        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 20;

        // Get employee ID for role-based filtering
        let employeeId = null;
        if (user.role !== 'ADMIN') {
            const employee = await employeeRepository.findByUserId(user.id);
            employeeId = employee ? employee.id : null;
        }

        const result = await customerRepository.listPaginated({
            page,
            limit,
            search: query.search || null,
            employeeId,
            role: user.role,
            userId: user.id
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

    async getById(customerId) {

        // 1️⃣ customer data
        const customer = await customerRepository.findById(customerId);

        if (!customer) {
            throw new Error('Customer not found');
        }

        // 2️⃣ orders
        const orders = await orderRepository.getOrdersByCustomerId(customerId);

        const orderIds = orders.map(o => o.id);

        // 3️⃣ items
        const items = await orderRepository.getItemsByOrderIds(orderIds);

        // 4️⃣ attach items to orders
        const ordersWithItems = orders.map(order => ({
            ...order,
            items: items.filter(i => i.order_id === order.id)
        }));

        return {
            ...customer,
            orders: ordersWithItems
        };

    }

}

module.exports = new CustomerService();
