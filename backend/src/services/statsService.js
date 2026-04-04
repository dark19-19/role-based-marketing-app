const statsRepo = require('../data/statsRepository');
const employeeRepo = require('../data/employeeRepository');
const customerRepo = require('../data/customerRepository');

class StatsService {
  // ==================== ADMIN STATS ====================

  /**
   * Get top 5 branches with most orders
   */
  async getMostSellingBranches() {
    return await statsRepo.getMostSellingBranches(5);
  }

  /**
   * Get top 5 marketers with most orders
   */
  async getMostOrderingMarketers() {
    return await statsRepo.getMostOrderingMarketers(5);
  }

  /**
   * Get top 5 customers with most orders
   */
  async getMostOrderingCustomers() {
    return await statsRepo.getMostOrderingCustomers(5);
  }

  /**
   * Get top 5 most sold products
   */
  async getMostSoldProducts() {
    return await statsRepo.getMostSoldProducts(5);
  }

  // ==================== BRANCH STATS ====================

  /**
   * Get top 5 marketers with most orders in a specific branch
   */
  async getMostOrderingMarketersByBranch(branchId) {
    return await statsRepo.getMostOrderingMarketersByBranch(branchId, 5);
  }

  /**
   * Get top 5 customers with most orders in a specific branch
   */
  async getMostOrderingCustomersByBranch(branchId) {
    return await statsRepo.getMostOrderingCustomersByBranch(branchId, 5);
  }

  // ==================== EMPLOYEE STATS ====================

  /**
   * Get profits for an employee
   */
  async getEmployeeProfits(employeeId) {
    const profits = await statsRepo.getEmployeeProfits(employeeId);
    return {
      total_profits: profits
    };
  }

  /**
   * Get last 5 orders for an employee
   */
  async getEmployeeLastOrders(employeeId) {
    return await statsRepo.getEmployeeLastOrders(employeeId, 5);
  }

  /**
   * Get top 5 ordering customers referred by an employee
   */
  async getEmployeeMostOrderingCustomers(employeeId) {
    return await statsRepo.getEmployeeMostOrderingCustomers(employeeId, 5);
  }

  // ==================== CUSTOMER STATS ====================

  /**
   * Get last 5 orders for a customer
   */
  async getCustomerLastOrders(customerId) {
    return await statsRepo.getCustomerLastOrders(customerId, 5);
  }

  /**
   * Get top 5 most sold products (for customer)
   */
  async getMostSoldProductsForCustomer() {
    return await statsRepo.getMostSoldProductsForCustomer(5);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Get employee ID from user object
   */
  async getEmployeeIdFromUser(user) {
    if (user.role === 'CUSTOMER') {
      const customer = await customerRepo.findByUserId(user.id);
      if (!customer) {
        throw new Error('Customer not found');
      }
      return { type: 'customer', id: customer.id };
    }

    if (user.role === 'ADMIN') {
      // Admin doesn't have an employee record
      return null;
    }

    const employee = await employeeRepo.findByUserId(user.id);
    if (!employee) {
      throw new Error('Employee not found');
    }
    return { type: 'employee', id: employee.id, branchId: employee.branch_id };
  }

  /**
   * Get branch ID for branch manager
   */
  async getBranchIdForBranchManager(user) {
    if (user.role !== 'BRANCH_MANAGER') {
      return null;
    }

    const employee = await employeeRepo.findByUserId(user.id);
    if (!employee) {
      throw new Error('Employee not found');
    }
    return employee.branch_id;
  }
}

module.exports = new StatsService();