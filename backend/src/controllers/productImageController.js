const productImageService = require("../services/productImageService");
const { upload, processImage } = require("../middleware/imageUpload");
class ProductImageController {
  addImage = [
    upload.single("image"), // استقبال ملف باسم image
    processImage, // معالجة الصورة
    async (req, res) => {
      try {
        const productId = req.params.id;

        // المسار الذي تم حفظ الصورة فيه
        const imageUrl = req.imagePath;

        const result = await productImageService.addImage(productId, imageUrl);

        res.status(201).json({
          success: true,
          data: result,
        });
      } catch (err) {
        res.status(400).json({
          success: false,
          error: err.message,
        });
      }
    },
  ];

  listImages = async (req, res) => {
    try {
      const productId = req.params.id;

      const result = await productImageService.listImages(productId);

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        error: err.message,
      });
    }
  };

  deleteImage = async (req, res) => {
    try {
      const imageId = req.params.id;

      const result = await productImageService.deleteImage(imageId);

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        error: err.message,
      });
    }
  };

  updateOrder = async (req, res) => {
    try {
      const imageId = req.params.id;
      const { sort_order } = req.body;

      const result = await productImageService.updateOrder(imageId, sort_order);

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        error: err.message,
      });
    }
  };

  bulkUpdateOrder = async (req, res) => {
    try {
      const { imageIds } = req.body;
      if (!imageIds) throw new Error("imageIds are required");

      await productImageService.bulkUpdateOrder(imageIds);

      res.json({
        success: true,
        message: "Order updated successfully",
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        error: err.message,
      });
    }
  };
}

module.exports = new ProductImageController();
