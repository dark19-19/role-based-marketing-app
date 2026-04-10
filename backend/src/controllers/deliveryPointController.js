const deliveryPointService = require('../services/deliveryPointService');

class DeliveryPointController {
  create = async (req, res) => {
    try {
      const result = await deliveryPointService.create(req.user, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  };

  listManagement = async (req, res) => {
    try {
      const result = await deliveryPointService.listManagement(req.user, {
        page: req.query.page,
        limit: req.query.limit,
        branch_id: req.query.branch_id,
      });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  };

  update = async (req, res) => {
    try {
      const result = await deliveryPointService.update(req.user, req.params.id, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  };

  remove = async (req, res) => {
    try {
      const result = await deliveryPointService.remove(req.user, req.params.id);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  };

  listForBranchPublic = async (req, res) => {
    try {
      const result = await deliveryPointService.listForBranchPublic(req.params.branchId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  };

  getPublicDetails = async (req, res) => {
    try {
      const result = await deliveryPointService.getPublicDetails(req.params.id);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  };
}

module.exports = new DeliveryPointController();

