const db = require('../helpers/DBHelper');
const { randomUUID } = require('crypto');

async function seedGovernorates() {

    const governorates = [
        'دمشق',
        'ريف دمشق',
        'حلب',
        'حمص',
        'حماة',
        'اللاذقية',
        'طرطوس',
        'إدلب',
        'الرقة',
        'دير الزور',
        'الحسكة',
        'درعا',
        'السويداء',
        'القنيطرة'
    ];

    try {

        for (const governorate of governorates) {
            const gov_id = randomUUID()
            await db.query(
                `INSERT INTO governorates (id, name)
         VALUES ($1,$2)
         ON CONFLICT (name) DO NOTHING`,
                [gov_id, governorate]
            );

            await db.query(`
                INSERT INTO branches (id, governorate_id)
                    VALUES ($1,$2)
                    
            `, [randomUUID(), gov_id])

        }

        console.log('✅ تمت إضافة المحافظات السورية بنجاح');

    } catch (err) {

        console.error('❌ حدث خطأ أثناء إضافة المحافظات', err);

    }

}

module.exports = seedGovernorates;