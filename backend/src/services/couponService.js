const couponRepo = require('../data/couponRepository');
const couponAvailabilityService = require('./couponAvailabilityService');
const customerRepo = require('../data/customerRepository');

class CouponService {
  normalizeCode(code) {
    return String(code || '').trim().toUpperCase();
  }

  parseDiscountPercentage(value) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed <= 0 || parsed > 100) {
      throw new Error('discount_percentage must be between 1 and 100');
    }
    return parsed;
  }

  parseNumberOfPeople(value) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      throw new Error('number_of_people must be greater than 0');
    }
    return parsed;
  }

  async createCoupon({ code, discount_percentage, number_of_people }) {
    const normalizedCode = this.normalizeCode(code);
    if (!normalizedCode) throw new Error('code is required');

    const discount = this.parseDiscountPercentage(discount_percentage);
    const numberOfPeople = this.parseNumberOfPeople(number_of_people);

    const existing = await couponRepo.findByCode(normalizedCode);
    if (existing) throw new Error('coupon code already exists');

    const created = await couponRepo.create({
      code: normalizedCode,
      discount_percentage: discount,
      number_of_people: numberOfPeople,
    });

    await couponAvailabilityService.syncCoupon(created);
    return created;
  }

  async listCoupons({ page = 1, limit = 20 }) {
    const pageNum = Number.parseInt(page, 10) || 1;
    const limitNum = Number.parseInt(limit, 10) || 20;
    const result = await couponRepo.listPaginated({ page: pageNum, limit: limitNum });
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

  async getCouponById(id) {
    const coupon = await couponRepo.findById(id);
    if (!coupon) throw new Error('coupon not found');
    return coupon;
  }

  async updateCoupon(id, payload) {
    const existing = await couponRepo.findById(id);
    if (!existing) throw new Error('coupon not found');

    const next = {};
    if (payload.code !== undefined) {
      const normalizedCode = this.normalizeCode(payload.code);
      if (!normalizedCode) throw new Error('code is required');
      const duplicate = await couponRepo.findByCode(normalizedCode);
      if (duplicate && duplicate.id !== id) throw new Error('coupon code already exists');
      next.code = normalizedCode;
    }

    if (payload.discount_percentage !== undefined) {
      next.discount_percentage = this.parseDiscountPercentage(payload.discount_percentage);
    }

    if (payload.number_of_people !== undefined) {
      next.number_of_people = this.parseNumberOfPeople(payload.number_of_people);
      if (next.number_of_people < Number(existing.used_count)) {
        throw new Error('number_of_people cannot be lower than current used count');
      }
    }

    const updated = await couponRepo.update(id, next);
    if (!updated) throw new Error('coupon not found');

    if (existing.code !== updated.code) {
      await couponAvailabilityService.removeCode(existing.code);
    }
    await couponAvailabilityService.syncCoupon(updated);
    return updated;
  }

  async checkAvailability(code, user = null) {
    const normalizedCode = this.normalizeCode(code);
    if (!normalizedCode) throw new Error('code is required');
    const result = await couponAvailabilityService.checkAvailability(normalizedCode);

    if (!result.available || !user || user.role !== 'CUSTOMER') {
      return result;
    }

    const customer = await customerRepo.findByUserId(user.id);
    if (!customer) {
      return { ...result, available: false, reason: 'customer_not_found' };
    }

    const used = await couponRepo.hasCustomerUsedCouponByCode({
      customerId: customer.id,
      code: normalizedCode,
    });

    if (used) {
      return {
        ...result,
        available: false,
        reason: 'already_used',
      };
    }

    return result;
  }
}

module.exports = new CouponService();
