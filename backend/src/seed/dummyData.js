const db = require('../helpers/DBHelper');
const { randomUUID } = require('crypto');
const bcrypt = require('bcrypt');
const roleSeeder = require('./rolesSeed');

const PREFIX = '0000_0000_';
const LOG_PREFIX = '🌱 [Seeder]';

// Configuration
const CONFIG = {

};

// Data Pools
const FIRST_NAMES = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Avery', 'Quinn', 'Skyler', 'Charlie', 'Sam', 'Peyton', 'Reese', 'Dakota', 'Hayden', 'Blake', 'Cameron'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas'];

// Helpers
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
const WITHDRAW_METHODS = ["ShamCash", "SYCash", "ALFooad", "Money-Flex"];
const WITHDRAW_STATUSES = ["pending", "approved", "rejected"];
const randomPhone = () => '09' + String(randomInt(10000000, 99999999));

async function getOrCreateMethod(name) {
  const { rows } = await db.query('SELECT id FROM methods WHERE method_name = $1', [name]);
  if (rows.length > 0) return rows[0].id;
  const { rows: newRows } = await db.query('INSERT INTO methods (method_name) VALUES ($1) RETURNING id', [name]);
  return newRows[0].id;
}

async function seed() {
  console.log(`${LOG_PREFIX} Starting comprehensive seed process...`);
  await roleSeeder()

  try {} catch (err) {
    console.error(`${LOG_PREFIX} ❌ Seeding failed:`, err);
    process.exit(1);
  }
}

seed();