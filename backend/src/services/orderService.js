const productRepository = require("../data/productRepository");
const orderRepository = require("../data/orderRepository");
const orderItemRepository = require("../data/orderItemRepository");
const customerRepository = require("../data/customerRepository");
const employeeRepository = require("../data/employeeRepository");
const branchRepository = require("../data/branchRepository");
const commissionRepo = require("../data/commissionRepository");
const walletRepo = require("../data/walletRepository");
const orderCommissionRepo = require("../data/orderCommissionRepository");
const deliveryPointRepo = require("../data/deliveryPointRepository");
const couponRepo = require("../data/couponRepository");
const TYPES = require("../utils/walletTransactionTypes");
const adminRepo = require("../data/adminRepository");
const notificationHelper = require("../helpers/notificationHelper");
const orderCommentService = require("../services/orderCommentService");
const couponService = require("./couponService");

class OrderService {
  async createOrder(user, payload, client) {
    let {
      customer_id,
      branch_id,
      delivery_point_id,
      items,
      sold_price,
      notes,
      coupon_code,
    } =
      payload;

    // 1️⃣ get customer
    // For CUSTOMER role, find by user_id (since frontend sends user.id, not customer.id)
    let customer;
    if (user.role === "CUSTOMER") {
      customer = await customerRepository.findByUserId(user.id);
    } else {
      customer = await customerRepository.findById(customer_id);
    }

    if (!customer) {
      throw new Error("Customer not found");
    }

    // Use the actual customer ID from the database
    customer_id = customer.id;

    // 2️⃣ determine marketer_id
    let marketerId = null;

    if (user.role === "CUSTOMER") {
      marketerId = customer.referred_by || null;
    } else {
      const employee = await employeeRepository.findByUserId(user.id);

      if (!employee) {
        throw new Error("Employee not found");
      }

      marketerId = employee.id;
    }

    // Allow null marketerId for self-registered customers (no referral)
    // if (!marketerId) {
    //   throw new Error("Invalid marketerId: could not determine marketer");
    // }

    // 3️⃣ determine branch
    const branch = await branchRepository.findById(branch_id);

    if (!branch) {
      throw new Error("Branch not found");
    }

    if (user.role === "CUSTOMER" && !delivery_point_id) {
      throw new Error("delivery point is required");
    }

    if (coupon_code && user.role !== "CUSTOMER") {
      throw new Error("Coupons are available for customer orders only");
    }

    let deliveryFee = 0;
    if (delivery_point_id) {
      const dp = await deliveryPointRepo.findById(delivery_point_id);
      if (!dp) {
        throw new Error("Delivery point not found");
      }
      if (dp.branch_id !== branch.id) {
        throw new Error("Delivery point does not belong to this branch");
      }
      const fee = Number(dp.fee);
      deliveryFee = Number.isNaN(fee) ? 0 : fee;
    }

    const soldBase = Number(sold_price);
    if (Number.isNaN(soldBase)) {
      throw new Error("sold_price is invalid");
    }

    if (user.role === "CUSTOMER" && coupon_code) {
      const availability = await couponService.checkAvailability(coupon_code, user);
      if (!availability.available && availability.reason === "already_used") {
        throw new Error("Coupon already used by this customer");
      }
    }

    // 4️⃣ get products
    const productIds = items.map((i) => i.product_id);

    const products = await productRepository.findByIds(productIds);

    const productMap = {};
    products.forEach((p) => (productMap[p.id] = p));

    // 5️⃣ calculate total_price
    let totalPrice = 0;

    for (const item of items) {
      const product = productMap[item.product_id];

      if (!product) {
        throw new Error(`Invalid product ${item.product_id}`);
      }

      await productRepository.decreaseQuantity({
        product_id: product.id,
        quantity: item.quantity,
      }, client);

      totalPrice += product.price * item.quantity;
    }

    // 6️⃣ create order
    // For CUSTOMER role, the frontend already includes delivery fee in sold_price
    // For other roles, add delivery fee on top of the raw product price
    let finalSoldPrice =
      user.role === "CUSTOMER" ? soldBase : soldBase + deliveryFee;
    let coupon = null;
    let discountAmount = 0;
    let discountPercentage = null;

    if (user.role === "CUSTOMER" && coupon_code) {
      coupon = await couponRepo.findByCodeForUpdate(client, coupon_code);

      if (!coupon) throw new Error("Coupon expired");

      const alreadyUsed = await couponRepo.hasCustomerUsedCoupon(client, {
        customerId: customer_id,
        couponId: coupon.id,
      });

      if (alreadyUsed) {
        throw new Error("Coupon already used by this customer");
      }

      if (Number(coupon.used_count) >= Number(coupon.number_of_people)) {
        throw new Error("Coupon expired");
      }

      discountPercentage = Number(coupon.discount_percentage);
      discountAmount = Number(
        (finalSoldPrice * (discountPercentage / 100)).toFixed(2),
      );
      finalSoldPrice = Number(Math.max(0, finalSoldPrice - discountAmount).toFixed(2));
    }

    const orderId = await orderRepository.create(
      {
        customer_id,
        marketer_id: marketerId,
        branch_id: branch.id,
        delivery_point_id: delivery_point_id || null,
        coupon_id: coupon?.id || null,
        discount_percentage: discountPercentage,
        discount_amount: discountAmount,
        total_price: totalPrice,
        sold_price: finalSoldPrice,
        notes,
      },
      client,
    );

    // 7️⃣ insert items
    const itemsWithPrice = items.map((i) => ({
      ...i,
      price: productMap[i.product_id].price,
    }));

    await orderItemRepository.bulkInsert(orderId, itemsWithPrice, client);

    let updatedCoupon = null;
    if (coupon) {
      await couponRepo.attachCouponToOrder(client, {
        customerId: customer_id,
        couponId: coupon.id,
        orderId,
      });
      updatedCoupon = await couponRepo.incrementUsedCount(client, coupon.id);
    }

    const branchManager = await branchRepository.getBranchManager(branch.id);

    // Ensure branchManager is valid
    if (!branchManager) {
      throw new Error(`No branch manager found for branch ID: ${branch.id}`);
    }

    await notificationHelper.notify(
      branchManager,
      "طلب جديد في الفرع",
      "تم إنشاء طلب جديد وتم تحويله إلى فرعكم. يرجى مراجعة الطلب واتخاذ الإجراء المناسب.",
    );

    return { orderId, updatedCoupon };
  }

  async approveOrder(user, orderId, client) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new Error("Order not found");
    if (order.status !== "PENDING")
      throw new Error("You cannot change this order status");

    const employee = await employeeRepository.findByUserId(user.id);
    if (!employee || employee.branch_id !== order.branch_id) {
      throw new Error("Unauthorized");
    }

    const items = await orderItemRepository.findByOrderId(orderId);
    let deliveryFee = 0;
    if (order.delivery_point_id) {
      const dp = await deliveryPointRepo.findById(order.delivery_point_id);
      if (dp) {
        const fee = Number(dp.fee);
        deliveryFee = Number.isNaN(fee) ? 0 : fee;
      }
    }
    const { distributions, metadata } = await this._calculateDistributions(
      order,
      items,
      deliveryFee,
    );

    // table: order_commissions
    await orderCommissionRepo.create({
      order_id: orderId,
      company: metadata.company,
      gs: metadata.gs,
      supervisor: metadata.supervisor,
      marketer: metadata.marketer,
    });

    // wallet transactions
    for (const dist of distributions) {
      if (dist.amount > 0) {
        await walletRepo.create({
          employee_id: dist.employee_id,
          order_id: orderId,
          amount: dist.amount,
          type: TYPES.BALANCE,
        });
      }
    }

    await orderRepository.updateStatus(orderId, "APPROVED", client);

    // Delete all comments for this order (force delete when order is approved)
    await orderCommentService.deleteCommentsByOrderId(orderId, client);

    // Notify the customer
    const customer = await customerRepository.findById(order.customer_id);
    if (customer) {
      await notificationHelper.notify(
        customer.user_id,
        "تم قبول طلبك",
        `تمت الموافقة على طلبك رقم ${orderId.substring(0, 8)} من قبل مدير الفرع.`,
      );
    }

    // Notify the marketer (only if order has a marketer)
    if (order.marketer_id) {
      const marketer = await employeeRepository.findById(order.marketer_id);
      if (marketer) {
        await notificationHelper.notify(
          marketer.user_id,
          "تم قبول طلبك",
          `تمت الموافقة على الطلب الذي قمت بإنشائه من قبل مدير الفرع، وتم إيداع المبلغ في حسابك.`,
        );
      }
    }
  }

  async _calculateDistributions(order, items, deliveryFee = 0) {
    const commissions = await commissionRepo.getAll();

    let company = 0;
    let gs = 0;
    let supervisor = 0;

    for (const item of items) {
      const specific = commissions.find(
        (c) => c.product_id === item.product_id,
      );
      const general = commissions.find((c) => c.product_id === null);
      const c = specific || general;

      if (!c) throw new Error("Commission not configured");

      const base = item.main_price * item.quantity;
      company += base * (c.company_percentage / 100);
      gs += base * (c.general_supervisor_percentage / 100);
      supervisor += base * (c.supervisor_percentage / 100);
    }

    const mainTotal = order.total_main_price;
    const extra = order.total_sold_price - mainTotal - deliveryFee;
    // Calculate marketer share BEFORE adding delivery fee to company
    // (delivery fee goes to company but should NOT reduce marketer's share)
    const marketer = mainTotal - (company + gs + supervisor) + extra;
    company += deliveryFee;

    // Handle orders without a marketer (self-registered customers)
    let marketerEmployee = order.marketer_id
      ? await employeeRepository.findById(order.marketer_id)
      : null;
    let supervisorEmployee = marketerEmployee?.supervisor_id
      ? await employeeRepository.findById(marketerEmployee.supervisor_id)
      : null;
    let gsEmployee = supervisorEmployee?.supervisor_id
      ? await employeeRepository.findById(supervisorEmployee.supervisor_id)
      : null;

    // If no marketer (self-registered customer), ALL profits go to company
    if (!marketerEmployee) {
      const totalProfit = order.total_sold_price;
      const admin = await adminRepo.getCompanyAccount();
      const distributions = [];

      if (admin) {
        distributions.push({
          employee_id: admin.emp_id,
          employee_name: "الشركة",
          amount: totalProfit,
        });
      }

      return {
        distributions,
        metadata: { company: totalProfit, gs: 0, supervisor: 0, marketer: 0 },
      };
    }

    // Hierarchy shifting (for orders WITH a marketer)
    if (gsEmployee === null) {
      company += gs;
      gs = supervisor;
      supervisor = 0;
      gsEmployee = supervisorEmployee;
      supervisorEmployee = null;
    }

    const admin = await adminRepo.getCompanyAccount();
    const distributions = [];

    if (admin)
      distributions.push({
        employee_id: admin.emp_id,
        employee_name: "الشركة",
        amount: company,
      });
    if (gsEmployee)
      distributions.push({
        employee_id: gsEmployee.id,
        employee_name: gsEmployee.name || "المشرف العام",
        amount: gs,
      });
    if (supervisorEmployee)
      distributions.push({
        employee_id: supervisorEmployee.id,
        employee_name: supervisorEmployee.name || "المشرف",
        amount: supervisor,
      });
    if (marketerEmployee)
      distributions.push({
        employee_id: marketerEmployee.id,
        employee_name: marketerEmployee.name || "المسوق",
        amount: marketer,
      });

    return {
      distributions,
      metadata: { company, gs, supervisor, marketer },
    };
  }

  async rejectOrder(user, orderId, client) {
    const order = await orderRepository.findById(orderId);

    if (!order) throw new Error("Order not found");

    if (order.status === "APPROVED")
      throw new Error("Order is approved, you cannot reject it");

    if (order.status === "REJECTED")
      throw new Error("Order is already rejected");

    const employee = await employeeRepository.findByUserId(user.id);

    if (!employee || employee.branch_id !== order.branch_id) {
      throw new Error("Unauthorized");
    }

    const items = await orderItemRepository.findByOrderId(orderId);

    // Restore product quantities
    for (const item of items) {
      await productRepository.increaseQuantity({
        product_id: item.product_id,
        quantity: item.quantity,
      }, client);
    }

    await orderRepository.updateStatus(orderId, "REJECTED", client);

    // Delete all comments for this order (force delete when order is rejected)
    await orderCommentService.deleteCommentsByOrderId(orderId, client);

    // Notify the customer
    const customer = await customerRepository.findById(order.customer_id);
    if (customer) {
      await notificationHelper.notify(
        customer.user_id,
        "تم رفض طلبك",
        `تم رفض طلبك رقم ${orderId.substring(0, 8)} من قبل مدير الفرع. يرجى مراجعة تفاصيل الطلب لمعرفة السبب.`,
      );
    }

    // Notify the marketer (only if order has a marketer)
    if (order.marketer_id) {
      const marketer = await employeeRepository.findById(order.marketer_id);
      if (marketer) {
        await notificationHelper.notify(
          marketer.user_id,
          "تم رفض الطلب",
          `تم رفض الطلب الذي قمت بإنشائه من قبل مدير الفرع. يرجى مراجعة تفاصيل الطلب لمعرفة السبب.`,
        );
      }
    }
  }

  async list(user, query) {
    try {
      const page = parseInt(query.page) || 1;
      const limit = parseInt(query.limit) || 20;

      // For CUSTOMER role, fetch the customer_id from the database
      if (user.role === "CUSTOMER") {
        const customer = await customerRepository.findByUserId(user.id);
        if (customer) {
          user.customer_id = customer.id; // Attach to user object for orderRepository
        }
      }

      // 🎯 Build filters object from query parameters
      const filters = {};

      // Time-based filter (default to 'recent' for staff, no filter for customers)
      if (user.role !== "CUSTOMER") {
        filters.time_filter = query.time_filter || "recent";
        if (filters.time_filter === "custom") {
          filters.start_date = query.start_date;
          filters.end_date = query.end_date;
        }
      }

      // Marketer filter (only for staff)
      if (user.role !== "CUSTOMER" && query.marketer_id) {
        filters.marketer_id = query.marketer_id;
      }

      // Status filter (only for staff)
      if (user.role !== "CUSTOMER" && query.status) {
        filters.status = query.status.toUpperCase();
      }

      // Branch filter (only for admin)
      if (user.role === "ADMIN" && query.branch_id) {
        filters.branch_id = query.branch_id;
      }

      const result = await orderRepository.listPaginated({
        user,
        page,
        limit,
        filters,
      });

      return {
        data: result.data,
        pagination: {
          total: result.total,
          page,
          limit,
          pages: Math.ceil(result.total / limit),
        },
        filters: {
          applied: filters,
          available: this._getAvailableFilters(user),
        },
      };
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get available filter options based on user role
   * @param {Object} user - The authenticated user
   * @returns {Object} Available filter options
   */
  _getAvailableFilters(user) {
    const baseFilters = {
      time_filters: [
        {
          value: "recent",
          label: "Most Recent (5 per marketer)",
          default: true,
        },
        { value: "today", label: "Today's Orders" },
        { value: "week", label: "This Week's Orders" },
        { value: "month", label: "This Month's Orders" },
        { value: "year", label: "This Year's Orders" },
        { value: "all", label: "All Orders" },
        { value: "custom", label: "Custom Range" },
      ],
      status_filters: [
        { value: "PENDING", label: "Pending" },
        { value: "APPROVED", label: "Approved" },
        { value: "REJECTED", label: "Rejected" },
      ],
    };

    if (user.role === "CUSTOMER") {
      // Customers don't get time filters or status filters
      return {
        time_filters: [],
        status_filters: [],
        marketer_filters: [],
        branch_filters: [],
      };
    }

    // Staff members get all filters
    const filters = {
      ...baseFilters,
      marketer_filters: [], // This would be populated by a separate API call
      branch_filters: user.role === "ADMIN" ? [] : [], // Admin gets branch filter, populated by separate API call
    };

    return filters;
  }

  async getById(orderId) {
    try {
      const order = await orderRepository.getById(orderId);

      if (!order) {
        throw new Error("الطلب غير موجود");
      }

      if (order.status === "PENDING") {
        try {
          const items = await orderItemRepository.findByOrderId(orderId);

          let deliveryFee = 0;
          if (order.delivery_point_id) {
            const dp = await deliveryPointRepo.findById(order.delivery_point_id);
            if (dp) {
              const fee = Number(dp.fee);
              deliveryFee = Number.isNaN(fee) ? 0 : fee;
            }
          }

          const { distributions } = await this._calculateDistributions(
            order,
            items,
            deliveryFee,
          );
          order.preview_transactions = distributions;
        } catch (e) {
          console.error("Failed to generate preview:", e);
        }
      }

      return order;
    } catch (err) {
      throw err;
    }
  }

  async cancelOrder(user, orderId, client) {
    const order = await orderRepository.findById(orderId);

    if (!order) {
      throw new Error("Order not found");
    }

    // Check if order is already cancelled
    if (order.status === "CANCELLED") {
      throw new Error("Order is already cancelled");
    }

    // Check if order status is PENDING - only pending orders can be cancelled
    if (order.status !== "PENDING") {
      throw new Error("Only pending orders can be cancelled");
    }

    // Role-based authorization
    const isAuthorized = await this._checkCancelAuthorization(user, order);
    if (!isAuthorized) {
      throw new Error("Unauthorized to cancel this order");
    }

    // Restore product quantities
    const items = await orderItemRepository.findByOrderId(orderId);
    for (const item of items) {
      await productRepository.increaseQuantity({
        product_id: item.product_id,
        quantity: item.quantity,
      });
    }

    // Update order status to CANCELLED
    await orderRepository.cancelOrder(orderId, client);

    // Notify the marketer
    const marketer = await employeeRepository.findById(order.marketer_id);
    if (marketer) {
      const marketerUserId = marketer.user_id;
      await notificationHelper.notify(
        marketerUserId,
        "تم إلغاء الطلب",
        `تم إلغاء الطلب رقم ${orderId.substring(0, 8)}. يرجى مراجعة تفاصيل الطلب.`,
      );
    }

    // Notify the customer
    const customer = await customerRepository.findById(order.customer_id);
    if (customer) {
      await notificationHelper.notify(
        customer.user_id,
        "تم إلغاء الطلب",
        `تم إلغاء الطلب رقم ${orderId.substring(0, 8)}.`,
      );
    }
  }

  async _checkCancelAuthorization(user, order) {
    const role = user.role;

    // ADMIN can cancel all orders
    if (role === "ADMIN") {
      return true;
    }

    // BRANCH_MANAGER can cancel orders in their branch only
    if (role === "BRANCH_MANAGER") {
      const employee = await employeeRepository.findByUserId(user.id);
      if (!employee || employee.branch_id !== order.branch_id) {
        return false;
      }
      return true;
    }

    // MARKETER can cancel orders they created only
    if (role === "MARKETER") {
      const employee = await employeeRepository.findByUserId(user.id);
      if (!employee) {
        return false;
      }
      return order.marketer_id === employee.id;
    }

    // SUPERVISOR can cancel orders made by them only
    if (role === "SUPERVISOR") {
      const employee = await employeeRepository.findByUserId(user.id);
      if (!employee) {
        return false;
      }
      return order.marketer_id === employee.id;
    }

    // GENERAL_SUPERVISOR can cancel orders made by them only
    if (role === "GENERAL_SUPERVISOR") {
      const employee = await employeeRepository.findByUserId(user.id);
      if (!employee) {
        return false;
      }
      return order.marketer_id === employee.id;
    }

    // CUSTOMER can cancel their own orders only
    if (role === "CUSTOMER") {
      // The user object should have customer_id when it's a customer
      return order.customer_id === user.customer_id;
    }

    return false;
  }
}

module.exports = new OrderService();
