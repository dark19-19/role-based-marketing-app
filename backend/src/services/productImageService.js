const productImageRepo = require('../data/productImageRepository');
const productRepo = require('../data/productRepository');
const cacheAside = require('../patterns/CacheAside');

class ProductImageService {

    async addImage(productId, imageUrl) {

        if (!imageUrl) throw new Error('image url required');

        const product = await productRepo.findById(productId);

        if (!product) {
            throw new Error('product not found');
        }

        const maxOrder = await productImageRepo.getMaxSortOrder(productId);

        const result = await productImageRepo.addImage(
            productId,
            imageUrl,
            maxOrder + 1
        );

        // Invalidate cache for products list
        cacheAside.invalidateByPrefix('products:list:');

        return result;

    }

    async listImages(productId) {

        const product = await productRepo.findById(productId);

        if (!product) {
            throw new Error('product not found');
        }

        return await productImageRepo.findImagesByProduct(productId);

    }

    async deleteImage(imageId) {

        const deleted = await productImageRepo.softDelete(imageId);
        if (!deleted) {
            throw new Error('image not found');
        }

        // Invalidate cache for products list
        cacheAside.invalidateByPrefix('products:list:');

        return {message: "image deleted"};

    }

    async updateOrder(imageId, newOrder) {

        if (newOrder === undefined) {
            throw new Error('new order required');
        }

        const updated = await productImageRepo.updateOrder(imageId, newOrder);
        if (!updated) {
            throw new Error('image not found');
        }

        // Invalidate cache for products list
        cacheAside.invalidateByPrefix('products:list:');

        return updated;

    }

    async bulkUpdateOrder(orderedIds) {
        if (!Array.isArray(orderedIds)) {
            throw new Error('Array of image IDs required');
        }
        const updated = await productImageRepo.bulkUpdateOrder(orderedIds);
        if (updated !== orderedIds.length) {
            throw new Error('image not found');
        }

        // Invalidate cache for products list
        cacheAside.invalidateByPrefix('products:list:');

        return updated;
    }

}

module.exports = new ProductImageService();
