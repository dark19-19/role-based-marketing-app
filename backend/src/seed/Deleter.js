const db = require('../helpers/DBHelper');

const PREFIX = '0000_0000_';

async function revoke() {
  console.log('🔥 Starting revocation process...');

  try {} catch (err) {
    console.error('❌ Revocation failed:', err);
    process.exit(1);
  }
}

revoke();