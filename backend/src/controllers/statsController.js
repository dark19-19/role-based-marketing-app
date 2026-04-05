const statsService = require('../services/statsService');
const employeeRepo = require('../data/employeeRepository');

class StatsController {
  // ==================== ADMIN STATS ====================

  /**
   * GET /stats/admin/most-selling-branches
   */
  async getMostSellingBranches(req, res) {
    try {
      const result = await statsService.getMostSellingBranches();
      res.json({
        success: true,
        body: result,
        message: 'تم جلب أكثر الفروع مبيعاً'
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: err.message
      });
    }
  };

  /**
   * GET /stats/admin/most-ordering-marketers
   */
  async getMostOrderingMarketers(req, res){
    try {
      const result = await statsService.getMostOrderingMarketers();
      res.json({
        success: true,
        body: result,
        message: 'تم جلب أكثر المسوقين طلبات'
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: err.message
      });
    }
  };

  /**
   * GET /stats/admin/most-ordering-customers
   */
  async getMostOrderingCustomers (req, res){
    try {
      const result = await statsService.getMostOrderingCustomers();
      res.json({
        success: true,
        body: result,
        message: 'تم جلب أكثر العملاء طلبات'
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: err.message
      });
    }
  };

  /**
   * GET /stats/admin/most-sold-products
   */
  async getMostSoldProducts (req, res){
    try {
      const result = await statsService.getMostSoldProducts();
      res.json({
        success: true,
        body: result,
        message: 'تم جلب أكثر المنتجات مبيعاً'
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: err.message
      });
    }
  };

  // ==================== BRANCH STATS ====================

  /**
   * GET /stats/branch/most-ordering-marketers
   */
  async getBranchMostOrderingMarketers(req, res){
    try {
      const branchId = await statsService.getBranchIdForBranchManager(req.user);
      if (!branchId) {
        throw new Error('Branch manager not found or unauthorized');
      }
      const result = await statsService.getMostOrderingMarketersByBranch(branchId);
      res.json({
        success: true,
        body: result,
        message: 'تم جلب أكثر المسوقين طلبات في الفرع'
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: err.message
      });
    }
  };

  /**
   * GET /stats/branch/most-ordering-customers
   */
  async getBranchMostOrderingCustomers (req, res){
    try {
      const branchId = await statsService.getBranchIdForBranchManager(req.user);
      if (!branchId) {
        throw new Error('Branch manager not found or unauthorized');
      }
      const result = await statsService.getMostOrderingCustomersByBranch(branchId);
      res.json({
        success: true,
        body: result,
        message: 'تم جلب أكثر العملاء طلبات في الفرع'
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: err.message
      });
    }
  };

  // ==================== EMPLOYEE STATS ====================

  /**
   * GET /stats/employee/profits
   */
  async getEmployeeProfits (req, res){
    try {
      const result = await statsService.getEmployeeIdFromUser(req.user);
      if (!result || result.type !== 'employee') {
        throw new Error('Unauthorized: Only employees can access this');
      }
      const profits = await statsService.getEmployeeProfits(result.id);
      res.json({
        success: true,
        body: profits,
        message: 'تم جلب الأرباح'
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: err.message
      });
    }
  };

  /**
   * GET /stats/employee/last-orders
   */
  async getEmployeeLastOrders (req, res) {
    try {
      const result = await statsService.getEmployeeIdFromUser(req.user);
      if (!result || result.type !== 'employee') {
        throw new Error('Unauthorized: Only employees can access this');
      }
      const orders = await statsService.getEmployeeLastOrders(result.id);
      res.json({
        success: true,
        body: orders,
        message: 'تم جلب آخر الطلبات'
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: err.message
      });
    }
  };

  /**
   * GET /stats/employee/most-ordering-customers
   */
  async getEmployeeMostOrderingCustomers (req, res) {
    try {
      const result = await statsService.getEmployeeIdFromUser(req.user);
      if (!result || result.type !== 'employee') {
        throw new Error('Unauthorized: Only employees can access this');
      }
      const customers = await statsService.getEmployeeMostOrderingCustomers(result.id);
      res.json({
        success: true,
        body: customers,
        message: 'تم جلب أكثر العملاء طلباً'
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: err.message
      });
    }
  };

  // ==================== CUSTOMER STATS ====================

  /**
   * GET /stats/customer/last-orders
   */
  async getCustomerLastOrders (req, res){
    try {
      const result = await statsService.getEmployeeIdFromUser(req.user);
      if (!result || result.type !== 'customer') {
        throw new Error('Unauthorized: Only customers can access this');
      }
      const orders = await statsService.getCustomerLastOrders(result.id);
      res.json({
        success: true,
        body: orders,
        message: 'تم جلب آخر الطلبات'
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: err.message
      });
    }
  };

  /**
   * GET /stats/customer/most-sold-products
   */
  async getCustomerMostSoldProducts (req, res) {
    try {
      const result = await statsService.getEmployeeIdFromUser(req.user);
      if (!result || result.type !== 'customer') {
        throw new Error('Unauthorized: Only customers can access this');
      }
      const products = await statsService.getMostSoldProductsForCustomer();
      res.json({
        success: true,
        body: products,
        message: 'تم جلب أكثر المنتجات مبيعاً'
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: err.message
      });
    }
  };
}

module.exports = new StatsController();