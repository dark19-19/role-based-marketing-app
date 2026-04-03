const { randomUUID } = require('crypto');
const categoryRepo = require('../data/categoryRepository');
const { isString } = require('../helpers/GeneralHelper');

class CategoryService {

  async createCategory({ name }) {

    name = isString(name, 'name is required');

    const exists = await categoryRepo.findByName(name);
    if (exists) {
      throw new Error('category already exists');
    }

    const id = randomUUID();

    return await categoryRepo.createCategory({
      id,
      name
    });
  }

async listCategories({ page = 1, limit = 20 } = {}) {

  const p = Number(page);
  const l = Number(limit);

  const validatedPage = (Number.isNaN(p) || p < 1) ? 1 : p;
  const validatedLimit = (Number.isNaN(l) || l < 1) ? 20 : Math.min(l, 100);

  const offset = (validatedPage - 1) * validatedLimit;

  const categories = await categoryRepo.findAll({
    limit: validatedLimit,
    offset
  });

  const total = await categoryRepo.count()

  return {
    categories,
    pagination: {
      total: total,
      page: validatedPage,
      limit: validatedLimit,
      pages: Math.ceil(total / validatedLimit)
    }
  };
}

  async updateCategory({ id, name }) {

    name = isString(name, 'name is required');

    const category = await categoryRepo.findById(id);
    if (!category) {
      throw new Error('category not found');
    }

    return await categoryRepo.updateCategory({
      id,
      name
    });
  }

  async deleteCategory(id) {

    const category = await categoryRepo.findById(id);
    if (!category) {
      throw new Error('category not found');
    }

    await categoryRepo.softDelete(id);

    return { message: 'category deleted' };
  }

}

module.exports = new CategoryService();