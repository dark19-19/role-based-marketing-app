const dbUtils = require('./utils/dbUtils');
const couponAvailabilityService = require('../src/services/couponAvailabilityService');

beforeEach(async () => {
  await dbUtils.resetDatabase();
  await dbUtils.seedBaseData();
  await couponAvailabilityService.initialize(true);
});
