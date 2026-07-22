const employeeRepository = require('../data/employeeRepository');
const customerRepository = require('../data/customerRepository');
const orderRepository = require('../data/orderRepository');
const governorateRepository = require('../data/governorateRepository');
const { isUuid } = require('../helpers/GeneralHelper');

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
            userId: user.id,
            filterType: query.filter_type || 'all'
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
            userId: user.id,
            filterType: query.filter_type || 'all'
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

    async getById(user, customerId) {

        // 1️⃣ customer data
        const customer = await customerRepository.findById(customerId);

        if (!customer) {
            throw new Error('Customer not found');
        }

        // 2️⃣ orders
        const excludeCustomerApp = ['MARKETER', 'SUPERVISOR', 'GENERAL_SUPERVISOR'].includes(user?.role);
        const orders = await orderRepository.getOrdersByCustomerId(customerId, { excludeCustomerApp });

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

    async updateMyGovernorate(user, payload) {
        const governorate_id = isUuid(payload?.governorate_id, 'معرف المحافظة غير صحيح');

        const customer = await customerRepository.findByUserIdWithActive(user.id);
        if (!customer) {
            throw new Error('Customer not found');

        }
       //  Relaxing Constraints ( since it doesn't affect anything along the way we become more graceful)
        // if (customer.governorate_id) {
        //     throw new Error('Governorate is already set');
        //
        // }

        if (customer.customer_origin !== 'SELF_REGISTERED') {
            throw new Error('Cannot update governorate for this customer');

        }

        const governorate = await governorateRepository.findById(governorate_id);
        if (!governorate) {
            throw new Error('المحافظة غير موجودة');
        }

        const updated = await customerRepository.updateGovernorateId(
            customer.id,
            governorate_id
        );
        if (!updated) {
            throw new Error('Failed to update governorate');
        }

        return { id: customer.id, governorate_id: updated.governorate_id };
    }

}

module.exports = new CustomerService();
