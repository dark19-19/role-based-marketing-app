const { randomUUID } = require('crypto');
const governorateRepo = require('../data/governorateRepository');
const { isString, isUuid } = require('../helpers/GeneralHelper');

class GovernorateService {

    async createGovernorate({ name }) {

        try {

            name = isString(name, 'اسم المحافظة مطلوب');

            const id = randomUUID();

            await governorateRepo.create({
                id,
                name
            });

            return { id, name };

        } catch (err) {
            throw err;
        }

    }

    async updateGovernorate({ id, name }) {

        try {

            id = isUuid(id, 'معرف المحافظة غير صحيح');
            name = isString(name, 'اسم المحافظة مطلوب');

            const exists = await governorateRepo.findById(id);

            if (!exists) {
                throw new Error('المحافظة غير موجودة');
            }

            await governorateRepo.update({
                id,
                name
            });

            return { id };

        } catch (err) {
            throw err;
        }

    }

    async deleteGovernorate(id) {

        try {

            id = isUuid(id, 'معرف المحافظة غير صحيح');

            const exists = await governorateRepo.findById(id);

            if (!exists) {
                throw new Error('المحافظة غير موجودة');
            }

            await governorateRepo.delete(id);

            return { id };

        } catch (err) {
            throw err;
        }

    }

    async listGovernorates({ page = 1, limit = 10 }) {

        try {

            page = Number(page);
            limit = Number(limit);

            const offset = (page - 1) * limit;

            const rows = await governorateRepo.list({ limit, offset });

            const total = await governorateRepo.count();

            return {
                data: rows,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            };

        } catch (err) {
            throw err;
        }

    }

}

module.exports = new GovernorateService();