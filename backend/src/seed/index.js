const roleSeeder = require("./rolesSeed");
const governorateSeeder = require("./governoratesSeed");

async function seed() {
    console.log(`Starting comprehensive seed process...`);

    try {
        await governorateSeeder()
        console.log(`✅ Seed done.`);
    } catch (err) {
        console.error(` ❌ Seeding failed:`, err);
        process.exit(1);
    }
}

seed();