const productImageRepo = require('../data/productImageRepository');
const productRepo = require('../data/productRepository');

class ProductImageService {

    async addImage(productId, imageUrl) {

        if (!imageUrl) throw new Error('image url required');

        const product = await productRepo.findById(productId);

        if (!product) {
            throw new Error('product not found');
        }

        const maxOrder = await productImageRepo.getMaxSortOrder(productId);

        return await productImageRepo.addImage(
            productId,
            imageUrl,
            maxOrder + 1
        );

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
        return updated;
    }

}

module.exports = new ProductImageService();
