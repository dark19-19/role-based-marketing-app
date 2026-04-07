const orderCommentService = require("../services/orderCommentService");

class OrderCommentController {
  /**
   * Add a comment to an order
   * POST /api/orders/:orderId/comments
   */
  async addComment(req, res) {
    try {
      const { orderId } = req.params;
      const { content } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          message: "Content is required",
        });
      }

      const comment = await orderCommentService.addComment(
        req.user,
        orderId,
        content.trim()
      );

      res.status(201).json({
        success: true,
        body: comment,
        message: "Comment added successfully",
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  }

  /**
   * Get comments for an order
   * GET /api/orders/:orderId/comments
   */
  async getComments(req, res) {
    try {
      const { orderId } = req.params;

      const comments = await orderCommentService.getComments(req.user, orderId);

      res.json({
        success: true,
        body: comments,
        message: "Comments fetched successfully",
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  }
}

module.exports = new OrderCommentController();