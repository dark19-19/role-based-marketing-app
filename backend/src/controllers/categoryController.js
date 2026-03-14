const categoryService = require('../services/categoryService');

class CategoryController {

  createCategory = async (req, res) => {
    try {
      const { name } = req.body;

      const result = await categoryService.createCategory({ name });

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

 listCategories = async (req, res) => {
  try {

    const page = req.query.page;
    const limit = req.query.limit;

    const result = await categoryService.listCategories({
      page,
      limit
    });

    res.status(200).json({
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

  updateCategory = async (req, res) => {
    try {

      const { id } = req.params;
      const { name } = req.body;

      const result = await categoryService.updateCategory({
        id,
        name
      });

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

  deleteCategory = async (req, res) => {
    try {

      const { id } = req.params;

      const result = await categoryService.deleteCategory(id);

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

module.exports = new CategoryController();