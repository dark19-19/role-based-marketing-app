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
    const isAuthorized = this._checkAddCommentAuthorization(user, order, employee);
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
   * Allowed: employees, branch managers, marketers
   */
  _checkAddCommentAuthorization(user, order, employee) {
    const role = user.role;

    // Admin cannot add comments (based on requirements)
    if (role === "ADMIN") {
      return false;
    }

    // Customers cannot add comments
    if (role === "CUSTOMER") {
      return false;
    }

    // Employees, branch managers, supervisors, general supervisors, marketers can add comments
    // but they must be related to the order's branch
    if (employee) {
      return employee.branch_id === order.branch_id;
    }

    return false;
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
   * Allowed: admin, branch manager of the branch, marketer who made the order
   */
  async _checkViewCommentAuthorization(user, order) {
    const role = user.role;

    // Admin can view all comments
    if (role === "ADMIN") {
      return true;
    }

    // Get employee data
    const employee = await employeeRepository.findByUserId(user.id);

    // Marketer can view comments for their own orders
    if (role === "MARKETER" && employee) {
      return order.marketer_id === employee.id;
    }

    // Branch manager can view comments for orders in their branch
    if (role === "BRANCH_MANAGER" && employee) {
      return order.branch_id === employee.branch_id;
    }

    // Supervisors and general supervisors can view comments for orders in their branch
    if ((role === "SUPERVISOR" || role === "GENERAL_SUPERVISOR") && employee) {
      return order.branch_id === employee.branch_id;
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