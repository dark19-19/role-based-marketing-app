const db = require("../helpers/DBHelper");
const orderService = require("../services/orderService");

class OrderController {
  async create(req, res) {
    try {
      const orderId = await db.runInTransaction(async (client) => {
        return await orderService.createOrder(req.user, req.body, client);
      });

      return res.json({
        success: true,
        data: { id: orderId },
      });
    } catch (err) {
      console.error(err);

      // Add detailed error messages
      const message = err.message || "An unexpected error occurred";
      return res.status(400).json({
        success: false,
        message,
      });
    }
  }
  async approve(req, res) {
    try {
      await db.runInTransaction(async (client) => {
        await orderService.approveOrder(req.user, req.params.id, client);
      });

      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async reject(req, res) {
    try {
      await db.runInTransaction(async (client) => {
        await orderService.rejectOrder(req.user, req.params.id, client);
      });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async list(req, res) {
    try {
      // 🎯 Extract and validate query parameters
      const { page, limit, time_filter, marketer_id, status, branch_id } =
        req.query;

      // Basic validation for numeric parameters
      if (page && isNaN(parseInt(page))) {
        return res.status(400).json({
          success: false,
          message: "Invalid page parameter",
        });
      }

      if (limit && isNaN(parseInt(limit))) {
        return res.status(400).json({
          success: false,
          message: "Invalid limit parameter",
        });
      }

      // Validate time_filter values
      const validTimeFilters = [
        "recent",
        "today",
        "week",
        "month",
        "year",
        "all",
      ];
      if (time_filter && !validTimeFilters.includes(time_filter)) {
        return res.status(400).json({
          success: false,
          message: `Invalid time_filter. Must be one of: ${validTimeFilters.join(", ")}`,
        });
      }

      // Validate status values
      const validStatuses = ["PENDING", "APPROVED", "REJECTED"];
      if (status && !validStatuses.includes(status.toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        });
      }

      // Role-based parameter validation
      if (req.user.role === "CUSTOMER") {
        // Customers shouldn't be able to use staff-only filters
        if (time_filter || marketer_id || status || branch_id) {
          return res.status(403).json({
            success: false,
            message: "Customers cannot use advanced filters",
          });
        }
      }

      if (req.user.role !== "ADMIN" && branch_id) {
        return res.status(403).json({
          success: false,
          message: "Only admins can filter by branch",
        });
      }

      const result = await orderService.list(req.user, req.query);

      res.json({
        success: true,
        body: result,
        message: "تم جلب الطلبات بنجاح",
      });
    } catch (err) {
      console.error("Error in order list:", err);
      res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  }

  async getById(req, res) {
    try {
      const result = await orderService.getById(req.params.id);

      res.json({
        success: true,
        body: result,
        message: "تم جلب تفاصيل الطلب بنجاح",
      });
    } catch (err) {
      res.status(404).json({
        success: false,
        message: err.message,
      });
    }
  }
}

module.exports = new OrderController();
