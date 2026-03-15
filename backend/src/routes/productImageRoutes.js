const express = require('express');
const router = express.Router();

const controller = require('../controllers/productImageController');

router.post(
'/products/:id/images',
controller.addImage
);

router.get(
'/products/:id/images',
controller.listImages
);

router.delete(
'/product-images/:id',
controller.deleteImage
);

router.put(
'/product-images/:id/order',
controller.updateOrder
);

module.exports = router;