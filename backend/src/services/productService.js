const productRepo = require('../data/productRepository');

class ProductService {

  async createProduct(data) {

    if (!data.name) throw new Error('name required');
    if (!data.price) throw new Error('price required');
    if (!data.category_id) throw new Error('category required');
    if (!data.image_url) throw new Error('product image required');

    return await productRepo.createProductWithImage(
      {
        name: data.name,
        description: data.description,
        price: data.price,
        quantity: data.quantity,
        category_id: data.category_id
      },
      data.image_url
    );
  }

  async listProducts({ page = 1, limit = 20 } = {}) {

    const p = Number(page);
    const l = Number(limit);

    const validatedPage = (Number.isNaN(p) || p < 1) ? 1 : p;
    const validatedLimit = (Number.isNaN(l) || l < 1) ? 20 : Math.min(l, 100);

    const offset = (validatedPage - 1) * validatedLimit;

    const products = await productRepo.findAll({
      limit: validatedLimit,
      offset
    });

    return {
      products,
      pagination: {
        page: validatedPage,
        limit: validatedLimit
      }
    };
  }

  async getProduct(id) {

    const product = await productRepo.findById(id);

    if (!product) {
      throw new Error('product not found');
    }

    return product;
  }

  async updateProduct(id, data) {

    const product = await productRepo.findById(id);

    if (!product) {
      throw new Error('product not found');
    }

    return await productRepo.updateProduct(id, data);
  }

  async deleteProduct(id) {

    const product = await productRepo.findById(id);

    if (!product) {
      throw new Error('product not found');
    }

    await productRepo.softDelete(id);

    return { message: "product deleted" };
  }

}

module.exports = new ProductService();