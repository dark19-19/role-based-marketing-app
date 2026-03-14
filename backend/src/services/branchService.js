const { randomUUID } = require('crypto');
const branchRepo = require('../data/branchRepository');
const { isString, isUuid } = require('../helpers/GeneralHelper');

class BranchService {

    async createBranch({ governorate_id }) {

        try {

            governorate_id = isUuid(governorate_id, 'المحافظة غير صحيحة');

            const id = randomUUID();

            await branchRepo.create({
                id,
                governorate_id
            });

            return { id,governorate_id };

        } catch (err) {
            throw err;
        }

    }

    async updateBranch({ id, name, governorate_id }) {

        try {

            id = isUuid(id, 'معرف الفرع غير صحيح');
            governorate_id = isUuid(governorate_id, 'المحافظة غير صحيحة');

            const exists = await branchRepo.findById(id);

            if (!exists) {
                throw new Error('الفرع غير موجود');
            }

            await branchRepo.update({
                id,
                governorate_id
            });

            return { id };

        } catch (err) {
            throw err;
        }

    }

    async deleteBranch(id) {

        try {

            id = isUuid(id, 'معرف الفرع غير صحيح');

            const exists = await branchRepo.findById(id);

            if (!exists) {
                throw new Error('الفرع غير موجود');
            }

            await branchRepo.delete(id);

            return { id };

        } catch (err) {
            throw err;
        }

    }

    async listBranches({ page = 1, limit = 10 }) {

        try {

            page = Number(page);
            limit = Number(limit);

            const offset = (page - 1) * limit;

            const rows = await branchRepo.list({ limit, offset });

            const total = await branchRepo.count();

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

module.exports = new BranchService();