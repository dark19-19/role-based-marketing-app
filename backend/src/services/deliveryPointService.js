const deliveryPointRepo = require('../data/deliveryPointRepository');
const branchRepo = require('../data/branchRepository');
const employeeRepo = require('../data/employeeRepository');

class DeliveryPointService {
  async create(user, payload) {
    const { branch_id, name, fee } = payload;
    if (!branch_id) throw new Error('branch_id is required');
    if (!name) throw new Error('name is required');

    const feeNum = Number(fee);
    if (Number.isNaN(feeNum) || feeNum < 0) throw new Error('fee must be a non-negative number');

    const branch = await branchRepo.findById(branch_id);
    if (!branch) throw new Error('branch not found');

    if (user.role === 'BRANCH_MANAGER') {
      const employee = await employeeRepo.findByUserId(user.id);
      if (!employee) throw new Error('employee not found');
      if (employee.branch_id !== branch_id) throw new Error('unauthorized');
    }

    return await deliveryPointRepo.create({ branch_id, name, fee: feeNum });
  }

  async listManagement(user, { page = 1, limit = 20, branch_id = null }) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const offset = (pageNum - 1) * limitNum;

    let effectiveBranchId = branch_id || null;

    if (user.role === 'BRANCH_MANAGER') {
      const employee = await employeeRepo.findByUserId(user.id);
      if (!employee) throw new Error('employee not found');
      effectiveBranchId = employee.branch_id;
    }

    const result = await deliveryPointRepo.listPaginated({
      branchId: effectiveBranchId,
      limit: limitNum,
      offset,
    });

    return {
      data: result.data,
      pagination: {
        total: result.total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(result.total / limitNum),
      },
    };
  }

  async update(user, id, payload) {
    const existing = await deliveryPointRepo.findById(id);
    if (!existing) throw new Error('delivery point not found');

    if (user.role === 'BRANCH_MANAGER') {
      const employee = await employeeRepo.findByUserId(user.id);
      if (!employee) throw new Error('employee not found');
      if (employee.branch_id !== existing.branch_id) throw new Error('unauthorized');
    }

    const next = {};
    if (payload.name !== undefined) {
      if (!payload.name) throw new Error('name is required');
      next.name = payload.name;
    }
    if (payload.fee !== undefined) {
      const feeNum = Number(payload.fee);
      if (Number.isNaN(feeNum) || feeNum < 0) throw new Error('fee must be a non-negative number');
      next.fee = feeNum;
    }

    const updated = await deliveryPointRepo.update(id, next);
    if (!updated) throw new Error('delivery point not found');
    return updated;
  }

  async remove(user, id) {
    const existing = await deliveryPointRepo.findById(id);
    if (!existing) throw new Error('delivery point not found');

    if (user.role === 'BRANCH_MANAGER') {
      const employee = await employeeRepo.findByUserId(user.id);
      if (!employee) throw new Error('employee not found');
      if (employee.branch_id !== existing.branch_id) throw new Error('unauthorized');
    }

    await deliveryPointRepo.remove(id);
    return true;
  }

  async listForBranchPublic(branchId) {
    const branch = await branchRepo.findById(branchId);
    if (!branch) throw new Error('branch not found');
    return await deliveryPointRepo.listForBranchPublic(branchId);
  }

  async getPublicDetails(id) {
    const details = await deliveryPointRepo.getPublicDetails(id);
    if (!details) throw new Error('delivery point not found');
    return details;
  }

  async getFee(id) {
    if (!id) return 0;
    const dp = await deliveryPointRepo.findById(id);
    if (!dp) return 0;
    const fee = Number(dp.fee);
    return Number.isNaN(fee) ? 0 : fee;
  }
}

module.exports = new DeliveryPointService();

