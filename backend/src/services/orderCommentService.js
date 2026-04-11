const orderCommentRepository = require("../data/orderCommentRepository");
const orderRepository = require("../data/orderRepository");
const employeeRepository = require("../data/employeeRepository");

class OrderCommentService {
  /**
   * Add a comment to an order
   * Allowed: employees, branch managers, marketers
   */
  async addComment(user, orderId, content) {
    // Verify order exists
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Check if order is still pending (can only comment on pending orders)
    if (order.status !== "PENDING") {
      throw new Error("Can only comment on pending orders");
    }

    // Get employee data if user is not admin/customer
    let employee = null;
    let employeeId = null;

    if (user.role !== "ADMIN" && user.role !== "CUSTOMER") {
      employee = await employeeRepository.findByUserId(user.id);
      if (!employee) {
        throw new Error("Employee not found");
      }
      employeeId = employee.id;
    }

    // Authorization check for adding comments
    const isAuthorized = await this._checkAddCommentAuthorization(user, order, employee);
    if (!isAuthorized) {
      throw new Error("Unauthorized to add comment to this order");
    }

    // Create the comment
    const comment = await orderCommentRepository.create({
      orderId,
      addedBy: user.id,
      content,
    });

    // Get the user info for response
    const { rows } = await require("../helpers/DBHelper").query(
      `
      SELECT u.first_name, u.last_name, r.name as role
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1
    `,
      [user.id]
    );

    return {
      ...comment,
      added_by_name: rows[0] ? `${rows[0].first_name} ${rows[0].last_name}` : null,
      added_by_role: rows[0] ? rows[0].role : null,
    };
  }

  /**
   * Check if user is authorized to add a comment
   * Allowed: employees, branch managers, supervisors, general supervisors, marketers
   *
   * Rules:
   * - BRANCH_MANAGER: orders in their branch
   * - SUPERVISOR: orders in their branch OR orders from marketers directly under them
   * - GENERAL_SUPERVISOR: orders in their branch OR orders from their hierarchy
   *   (supervisors under them + marketers under those supervisors)
   * - MARKETER: only their own orders
   */
  async _checkAddCommentAuthorization(user, order, employee) {
    const role = user.role;

    // Admin cannot add comments (based on requirements)
    if (role === "ADMIN") {
      return false;
    }

    // Customers cannot add comments
    if (role === "CUSTOMER") {
      return false;
    }

    if (!employee) {
      return false;
    }

    // Branch managers can comment on orders in their branch
    if (role === "BRANCH_MANAGER") {
      return employee.branch_id === order.branch_id;
    }

    // Marketers can only comment on their own orders
    if (role === "MARKETER") {
      return order.marketer_id === employee.id;
    }

    // SUPERVISOR: can comment on orders in their branch OR orders from their team (marketers under them)
    // OR their own orders (when the supervisor is the one who created the order)
    if (role === "SUPERVISOR") {
      if (employee.branch_id === order.branch_id) return true;
      if (order.marketer_id === employee.id) return true; // own order
      return await this._isMarketerUnderSupervisor(order.marketer_id, employee.id);
    }

    // GENERAL_SUPERVISOR: can comment on orders in their branch OR orders from their full hierarchy
    // OR their own orders
    if (role === "GENERAL_SUPERVISOR") {
      if (employee.branch_id === order.branch_id) return true;
      if (order.marketer_id === employee.id) return true; // own order
      return await this._isInGeneralSupervisorHierarchy(order.marketer_id, employee.id);
    }

    return false;
  }

  /**
   * Check if a marketer is a direct subordinate of a supervisor
   */
  async _isMarketerUnderSupervisor(marketerId, supervisorId) {
    return await orderRepository._marketerReportsToSupervisor(marketerId, supervisorId);
  }

  /**
   * Check if a marketer is somewhere under a general supervisor's chain
   */
  async _isInGeneralSupervisorHierarchy(marketerId, generalSupervisorId) {
    return await orderRepository._marketerReportsToGeneralSupervisor(marketerId, generalSupervisorId);
  }

  /**
   * Get comments for an order
   * Allowed: admin, branch manager of the branch, marketer who made the order
   */
  async getComments(user, orderId) {
    // Verify order exists
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Authorization check for viewing comments
    const isAuthorized = await this._checkViewCommentAuthorization(user, order);
    if (!isAuthorized) {
      throw new Error("Unauthorized to view comments for this order");
    }

    // Get comments
    const comments = await orderCommentRepository.findByOrderId(orderId);

    return comments;
  }

  /**
   * Check if user is authorized to view comments
   * Allowed: admin, branch manager of the branch, marketer who made the order,
   *   supervisor/general_supervisor for their team orders
   */
  async _checkViewCommentAuthorization(user, order) {
    const role = user.role;

    // Admin can view all comments
    if (role === "ADMIN") {
      return true;
    }

    // Get employee data
    const employee = await employeeRepository.findByUserId(user.id);
    if (!employee) {
      return false;
    }

    // Marketer can view comments for their own orders
    if (role === "MARKETER") {
      return order.marketer_id === employee.id;
    }

    // Branch manager can view comments for orders in their branch
    if (role === "BRANCH_MANAGER") {
      return order.branch_id === employee.branch_id;
    }

    // Supervisor can view comments for orders in their branch OR their team orders
    // OR their own orders
    if (role === "SUPERVISOR") {
      if (order.branch_id === employee.branch_id) return true;
      if (order.marketer_id === employee.id) return true; // own order
      return await this._isMarketerUnderSupervisor(order.marketer_id, employee.id);
    }

    // General supervisor can view comments for orders in their branch OR their hierarchy
    // OR their own orders
    if (role === "GENERAL_SUPERVISOR") {
      if (order.branch_id === employee.branch_id) return true;
      if (order.marketer_id === employee.id) return true; // own order
      return await this._isInGeneralSupervisorHierarchy(order.marketer_id, employee.id);
    }

    return false;
  }

  /**
   * Delete all comments for an order (called when order is approved or rejected)
   */
  async deleteCommentsByOrderId(orderId, client) {
    await orderCommentRepository.deleteByOrderId(orderId, client);
  }
}

module.exports = new OrderCommentService();