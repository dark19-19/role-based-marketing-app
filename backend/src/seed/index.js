const seedDummyData = require('./dummyData');
const roleSeeder = require("./rolesSeed");
const governorateSeeder = require("./governoratesSeed");

async function seed() {
    console.log(`Starting comprehensive seed process...`);

    try {
        await governorateSeeder();
        await roleSeeder();
        console.log(`✅ Seed done.`);
    } catch (err) {
        console.error(` ❌ Seeding failed:`, err);
        process.exit(1);
    }
}
//don't use it in production
seedDummyData();

seed();