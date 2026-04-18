const BloomFilter = require('../utils/BloomFilter');
const couponRepo = require('../data/couponRepository');

class CouponAvailabilityService {
  constructor() {
    this.initialized = false;
    this.loadingPromise = null;
    this.availableCoupons = new Map();
    this.bloom = new BloomFilter();
  }

  normalizeCode(code) {
    return String(code || '').trim().toUpperCase();
  }

  async initialize(force = false) {
    if (this.initialized && !force) return;
    if (this.loadingPromise && !force) return this.loadingPromise;

    this.loadingPromise = (async () => {
      const rows = await couponRepo.listAvailableForCache();
      const expectedItems = Math.max(rows.length || 1, 1000);
      this.bloom = new BloomFilter(expectedItems, 0.01);
      this.availableCoupons = new Map();

      for (const row of rows) {
        const code = this.normalizeCode(row.code);
        this.availableCoupons.set(code, {
          id: row.id,
          code,
          discount_percentage: Number(row.discount_percentage),
          remaining_count: Number(row.remaining_count),
        });
        this.bloom.add(code);
      }

      this.initialized = true;
      this.loadingPromise = null;
    })().catch((err) => {
      this.loadingPromise = null;
      throw err;
    });

    return this.loadingPromise;
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  async checkAvailability(code) {
    await this.ensureInitialized();

    const normalizedCode = this.normalizeCode(code);
    if (!normalizedCode) {
      return { available: false, code: normalizedCode };
    }

    if (!this.bloom.mightContain(normalizedCode)) {
      return { available: false, code: normalizedCode };
    }

    const cached = this.availableCoupons.get(normalizedCode);
    if (cached && cached.remaining_count > 0) {
      return {
        available: true,
        code: normalizedCode,
        discount_percentage: cached.discount_percentage,
      };
    }

    const coupon = await couponRepo.findByCode(normalizedCode);
    if (!coupon) {
      return { available: false, code: normalizedCode };
    }

    const remaining = Number(coupon.number_of_people) - Number(coupon.used_count);
    if (remaining <= 0) {
      this.availableCoupons.delete(normalizedCode);
      return { available: false, code: normalizedCode };
    }

    this.availableCoupons.set(normalizedCode, {
      id: coupon.id,
      code: normalizedCode,
      discount_percentage: Number(coupon.discount_percentage),
      remaining_count: remaining,
    });
    this.bloom.add(normalizedCode);

    return {
      available: true,
      code: normalizedCode,
      discount_percentage: Number(coupon.discount_percentage),
    };
  }

  async precheckOrThrow(code) {
    const result = await this.checkAvailability(code);
    if (!result.available) {
      throw new Error('Coupon not available');
    }
    return result;
  }

  async syncCoupon(coupon) {
    await this.ensureInitialized();
    const code = this.normalizeCode(coupon.code);
    const remaining =
      Number(coupon.number_of_people || 0) - Number(coupon.used_count || 0);

    if (remaining > 0) {
      this.availableCoupons.set(code, {
        id: coupon.id,
        code,
        discount_percentage: Number(coupon.discount_percentage),
        remaining_count: remaining,
      });
      this.bloom.add(code);
    } else {
      this.availableCoupons.delete(code);
    }
  }

  async removeCode(code) {
    await this.ensureInitialized();
    this.availableCoupons.delete(this.normalizeCode(code));
  }
}

module.exports = new CouponAvailabilityService();

