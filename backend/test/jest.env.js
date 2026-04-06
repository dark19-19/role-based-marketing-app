process.env.NODE_ENV = 'test';

process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ||
  'postgres://postgres:postgres@localhost:5432/Seeder-test';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || 'x'.repeat(32);
