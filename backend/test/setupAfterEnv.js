const dbUtils = require('./utils/dbUtils');
const couponAvailabilityService = require('../src/services/couponAvailabilityService');

jest.setTimeout(Number(process.env.JEST_TEST_TIMEOUT_MS || 30000));

beforeEach(async () => {
  await dbUtils.resetDatabase();
  await dbUtils.seedBaseData();
  await couponAvailabilityService.initialize(true);
});
