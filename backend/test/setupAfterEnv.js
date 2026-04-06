const dbUtils = require('./utils/dbUtils');

beforeEach(async () => {
  await dbUtils.resetDatabase();
  await dbUtils.seedBaseData();
});
