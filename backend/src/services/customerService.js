const employeeRepository = require('../data/employeeRepository');
const customerRepository = require('../data/customerRepository');
const orderRepository = require('../data/orderRepository');

class CustomerService {

    async createCustomerByEmployee(userId, payload) {

        const employee = await employeeRepository.findByUserId(userId);

        if (!employee) {
            throw new Error('Employee not found');
        }

        if (!payload || typeof payload !== 'object') {
            throw new Error('Invalid payload');
        }

        const first_name = String(payload.first_name || '').trim();
        const last_name = String(payload.last_name || '').trim();
        const phone = String(payload.phone || '').trim();
        const governorate_id = payload.governorate_id || null;

        if (!first_name) throw new Error('يرجى إدخال اسم أول صحيح');
        if (!last_name) throw new Error('يرجى إدخال اسم ثاني صحيح');
        if (!phone) throw new Error('رقم الهاتف مطلوب');

        const existingCustomer = await customerRepository.findByPhoneNumber(payload.phone);
        if (existingCustomer) {
            throw new Error('رقم الهاتف مستخدم مسبقاً');
        }

        const customerId = await customerRepository.create(
            {
                user_id: null,
                referred_by: employee.id,
                first_marketer_id: employee.id,
                governorate_id,
                first_name,
                last_name,
                phone,
                has_account: false,
                account_created_at: null,
                customer_origin: 'INTERNAL',
            }
        );

        return customerId;

    }

    async listCustomers(user, query) {

        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 20;

        // All roles see all customers (needed for checkout customer selection)
        // Only /customers/my endpoint filters by current user
        const result = await customerRepository.listPaginated({
            page,
            limit,
            search: query.search || null,
            employeeId: null, // No filtering by employee for the main list
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

    async listMyCustomers(user, query) {
        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 20;

        // Get employee ID for the current user
        const employee = await employeeRepository.findByUserId(user.id);
        if (!employee) {
            return {
                data: [],
                pagination: {
                    total: 0,
                    page,
                    limit,
                    pages: 0
                }
            };
        }

        const result = await customerRepository.listPaginated({
            page,
            limit,
            search: query.search || null,
            employeeId: employee.id, // Filter by current user's employee ID
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
