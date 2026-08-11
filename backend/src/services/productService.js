const productRepo = require('../data/productRepository');
const productImageRepo = require('../data/productImageRepository');
const cacheAside = require('../patterns/CacheAside');

const PRODUCTS_LIST_CACHE_PREFIX = 'products:list:';

class ProductService {

  async createProduct(data) {

    if (!data.name) throw new Error('name required');
    if (!data.price) throw new Error('price required');
    if (!data.category_id) throw new Error('category required');

    const created = await productRepo.createProductWithImage(
      {
        name: data.name,
        description: data.description,
        price: data.price,
        quantity: data.quantity,
        category_id: data.category_id
      },
    );
    cacheAside.invalidateByPrefix(PRODUCTS_LIST_CACHE_PREFIX);
    return created;
  }

  async listProducts({ page = 1, limit = 20, category_id = null } = {}) {

    const p = Number(page);
    const l = Number(limit);

    const validatedPage = (Number.isNaN(p) || p < 1) ? 1 : p;
    const validatedLimit = (Number.isNaN(l) || l < 1) ? 20 : Math.min(l, 100);

    const offset = (validatedPage - 1) * validatedLimit;

    const categoryIdRaw = category_id === undefined || category_id === null ? null : String(category_id).trim();
    const categoryId = categoryIdRaw ? categoryIdRaw : null;
    if (categoryId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryId)) {
      throw new Error('Invalid category id');
    }

    const total = await productRepo.count({ categoryId });

    const products = await productRepo.findAll({
      limit: validatedLimit,
      offset,
      categoryId
    });

    return {
      products,
      pagination: {
        total: total,
        page: validatedPage,
        limit: validatedLimit,
        pages: Math.ceil(total / validatedLimit)
      }
    };
  }

  async getProduct(id) {

    const product = await productRepo.findById(id);

    if (!product) {
      throw new Error('product not found');
    }

    const images = await productImageRepo.findImagesByProduct(id)

    return {
      product: product,
      images: images
    }
  }

  async updateProduct(id, data) {

    const product = await productRepo.findById(id);

    if (!product) {
      throw new Error('product not found');
    }
    console.log(data)
    console.log(product);
    const validatedData = {
      name: data.name === "" ? product.name : data.name,
      description: data.description === "" ? product.description: data.description,
      price: data.price === "" ? product.price: data.price,
      quantity: data.quantity === "" ? product.quantity: data.quantity,
      category_id: data.category_id === "" ? product.category_id : data.category_id
    }
    console.log(validatedData)

    const updated = await productRepo.updateProduct(id, validatedData);
    cacheAside.invalidateByPrefix(PRODUCTS_LIST_CACHE_PREFIX);
    return updated;
  }

  async deleteProduct(id) {

    const product = await productRepo.findById(id);

    if (!product) {
      throw new Error('product not found');
    }

    await productRepo.softDelete(id);
    cacheAside.invalidateByPrefix(PRODUCTS_LIST_CACHE_PREFIX);

    return { message: "product deleted" };
  }

}

module.exports = new ProductService();
