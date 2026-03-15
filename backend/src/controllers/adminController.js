const adminService = require('../services/adminService');
const employeeService = require('../services/employeeService');

class AdminController {
  registerAdmin = async (req,res)=>{
  try{

    const { first_name, last_name, phone ,password } = req.body;

    const result = await adminService.registerAdmin({
      first_name,
      last_name,
      phone,
      password
    });

    res.status(201).json({
      success:true,
      data:result
    });

  }catch(err){
    res.status(400).json({
      success:false,
      error:err.message
    });
  }
}

  listUsers = async (req, res) => {
    try {
      const { page, limit, order } = req.query;
      const result = await adminService.listUsers({ page, limit, order });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  createUser = async (req,res,next)=>{
  try{
    const result = await adminService.createUser(req.body);
    res.status(200).json({
      success:true,
      data:result,
      message: "تم إنشاء الموظف بنجاح"
    });
  }catch(err){
    res.status(400).json({
      success:false,
      error:err.message
    })
  }
};

  searchUsers = async (req, res) => {
    try {
      const { q } = req.query;
      const result = await adminService.searchUsers({ query: q });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  listEmployees = async (req, res) => {
    try {
      const { page, limit } = req.query;

      const result = await employeeService.listEmployees({limit, page});

      res.status(200).json({
        success: true,
        data: result
      })
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}

module.exports = new AdminController();
