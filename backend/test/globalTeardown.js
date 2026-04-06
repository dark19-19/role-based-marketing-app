module.exports = async () => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL =
    process.env.DATABASE_URL_TEST ||
    'postgres://postgres:postgres@localhost:5432/Seeder-test';

  const db = require('../src/helpers/DBHelper');
  await db.close();
};
