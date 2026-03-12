const roleService = require('../services/roleService');

class RoleController {

  createRole = async (req,res)=>{
    try{

      const { name } = req.body;

      const result = await roleService.createRole({ name });

      res.status(201).json({
        success:true,
        body:result,
        message:"تم إنشاء الدور بنجاح"
      });

    }catch(err){
      res.status(400).json({
        success:false,
        message:err.message
      });
    }
  }

  getRoles = async(req,res)=>{
    try{

      const result = await roleService.getRoles();

      res.json({
        success:true,
        body:result,
        message:"تم جلب الأدوار بنجاح"
      });

    }catch(err){
      res.status(400).json({
        success:false,
        message:err.message
      });
    }
  }

  getRole = async(req,res)=>{
    try{

      const result = await roleService.getRoleById(req.params.id);

      res.json({
        success:true,
        body:result,
        message:"تم جلب الدور بنجاح"
      });

    }catch(err){
      res.status(400).json({
        success:false,
        message:err.message
      });
    }
  }

  updateRole = async(req,res)=>{
    try{

      const result = await roleService.updateRole({
        id:req.params.id,
        name:req.body.name
      });

      res.json({
        success:true,
        body:result,
        message:"تم تعديل الدور بنجاح"
      });

    }catch(err){
      res.status(400).json({
        success:false,
        message:err.message
      });
    }
  }

  deleteRole = async(req,res)=>{
    try{

      await roleService.deleteRole(req.params.id);

      res.json({
        success:true,
        body:{},
        message:"تم حذف الدور بنجاح"
      });

    }catch(err){
      res.status(400).json({
        success:false,
        message:err.message
      });
    }
  }

}

module.exports = new RoleController();