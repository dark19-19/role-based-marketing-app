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

        await productImageRepo.softDelete(imageId);

        return {message: "image deleted"};

    }

    async updateOrder(imageId, newOrder) {

        if (newOrder === undefined) {
            throw new Error('new order required');
        }

        return await productImageRepo.updateOrder(imageId, newOrder);

    }

}

module.exports = new ProductImageService();