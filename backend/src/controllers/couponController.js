const couponService = require('../services/couponService');

class CouponController {
  create = async (req, res) => {
    try {
      const result = await couponService.createCoupon(req.body || {});
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  };

  list = async (req, res) => {
    try {
      const result = await couponService.listCoupons(req.query || {});
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  };

  getById = async (req, res) => {
    try {
      const result = await couponService.getCouponById(req.params.id);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  };

  update = async (req, res) => {
    try {
      const result = await couponService.updateCoupon(req.params.id, req.body || {});
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  };

  checkAvailability = async (req, res) => {
    try {
      const result = await couponService.checkAvailability(req.query.code, req.user);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  };
}

module.exports = new CouponController();
