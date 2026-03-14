const productService = require('../services/productService');

class ProductController {

  createProduct = async (req, res) => {

    try {

      const result = await productService.createProduct(req.body);

      res.status(201).json({
        success: true,
        data: result
      });

    } catch (err) {

      res.status(400).json({
        success: false,
        error: err.message
      });

    }

  };

  listProducts = async (req, res) => {

    try {

      const { page, limit } = req.query;

      const result = await productService.listProducts({ page, limit });

      res.json({
        success: true,
        data: result
      });

    } catch (err) {

      res.status(400).json({
        success: false,
        error: err.message
      });

    }

  };

  getProduct = async (req, res) => {

    try {

      const result = await productService.getProduct(req.params.id);

      res.json({
        success: true,
        data: result
      });

    } catch (err) {

      res.status(404).json({
        success: false,
        error: err.message
      });

    }

  };

  updateProduct = async (req, res) => {

    try {

      const result = await productService.updateProduct(req.params.id, req.body);

      res.json({
        success: true,
        data: result
      });

    } catch (err) {

      res.status(400).json({
        success: false,
        error: err.message
      });

    }

  };

  deleteProduct = async (req, res) => {

    try {

      const result = await productService.deleteProduct(req.params.id);

      res.json({
        success: true,
        data: result
      });

    } catch (err) {

      res.status(400).json({
        success: false,
        error: err.message
      });

    }

  };

}

module.exports = new ProductController();