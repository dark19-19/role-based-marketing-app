const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const requireRole = require('../middleware/roleMiddleware');

const statsController = require('../controllers/statsController');

// ==================== ADMIN STATS ====================

// GET /stats/admin/most-selling-branches
router.get(
  '/admin/most-selling-branches',
  auth,
  requireRole(['ADMIN']),
  statsController.getMostSellingBranches
);

// GET /stats/admin/most-ordering-marketers
router.get(
  '/admin/most-ordering-marketers',
  auth,
  requireRole(['ADMIN']),
  statsController.getMostOrderingMarketers
);

// GET /stats/admin/most-ordering-customers
router.get(
  '/admin/most-ordering-customers',
  auth,
  requireRole(['ADMIN']),
  statsController.getMostOrderingCustomers
);

// GET /stats/admin/most-sold-products
router.get(
  '/admin/most-sold-products',
  auth,
  requireRole(['ADMIN']),
  statsController.getMostSoldProducts
);

// ==================== BRANCH STATS ====================

// GET /stats/branch/most-ordering-marketers
router.get(
  '/branch/most-ordering-marketers',
  auth,
  requireRole(['BRANCH_MANAGER']),
  statsController.getBranchMostOrderingMarketers
);

// GET /stats/branch/most-ordering-customers
router.get(
  '/branch/most-ordering-customers',
  auth,
  requireRole(['BRANCH_MANAGER']),
  statsController.getBranchMostOrderingCustomers
);

// ==================== EMPLOYEE STATS ====================

// GET /stats/employee/profits
router.get(
  '/employee/profits',
  auth,
  requireRole(['MARKETER', 'SUPERVISOR', 'GENERAL_SUPERVISOR']),
  statsController.getEmployeeProfits
);

// GET /stats/employee/last-orders
router.get(
  '/employee/last-orders',
  auth,
  requireRole(['MARKETER', 'SUPERVISOR', 'GENERAL_SUPERVISOR']),
  statsController.getEmployeeLastOrders
);

// GET /stats/employee/most-ordering-customers
router.get(
  '/employee/most-ordering-customers',
  auth,
  requireRole(['MARKETER', 'SUPERVISOR', 'GENERAL_SUPERVISOR']),
  statsController.getEmployeeMostOrderingCustomers
);

// ==================== CUSTOMER STATS ====================

// GET /stats/customer/last-orders
router.get(
  '/customer/last-orders',
  auth,
  requireRole(['CUSTOMER']),
  statsController.getCustomerLastOrders
);

// GET /stats/customer/most-sold-products
router.get(
  '/customer/most-sold-products',
  auth,
  requireRole(['CUSTOMER']),
  statsController.getCustomerMostSoldProducts
);

module.exports = router;