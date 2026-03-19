const commissionRepository = require('../data/commissionRepository');

class CommissionService {

    validatePercentages(data) {

        const sum =
            data.company_percentage +
            data.general_supervisor_percentage +
            data.supervisor_percentage;

        if (sum > 100) {
            throw new Error('Total percentage cannot exceed 100');
        }

    }

    async create(payload) {

        this.validatePercentages(payload);

        return await commissionRepository.create(payload);

    }

    async update(id, payload) {

        const existing = await commissionRepository.findById(id);

        if (!existing) throw new Error('Commission not found');

        this.validatePercentages(payload);

        await commissionRepository.update(id, payload);

    }

    async delete(id) {

        const existing = await commissionRepository.findById(id);

        if (!existing) throw new Error('Commission not found');

        await commissionRepository.delete(id);

    }

    async getById(id) {

        const data = await commissionRepository.findById(id);

        if (!data) throw new Error('Commission not found');

        return data;

    }

    async getByProductId(productId) {

        return await commissionRepository.findByProductId(productId);

    }

    async list(query) {

        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 20;

        const result = await commissionRepository.listPaginated({
            page,
            limit
        });

        return {
            data: result.data,
            pagination: {
                total: result.total,
                page,
                limit,
                pages: Math.ceil(result.total / limit)
            }
        };

    }

}

module.exports = new CommissionService();