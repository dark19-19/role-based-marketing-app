const db = require('../helpers/DBHelper');

function requireRole(roleName) {

  return async (req,res,next)=>{

    try{

      const sql = `
        SELECT r.name
        FROM users u
        JOIN roles r ON r.id = u.role_id
        WHERE u.id=$1
      `;

      const { rows } = await db.query(sql,[req.user.id]);

      if(!rows[0]){
        return res.status(403).json({
          success:false,
          message:"غير مصرح لك بتنفيذ هذه العملية"
        });
      }

      if(rows[0].name !== roleName){
        return res.status(403).json({
          success:false,
          message:"ليس لديك صلاحية الوصول"
        });
      }

      next();

    }catch(err){
      return res.status(403).json({
        success:false,
        message:"حدث خطأ أثناء التحقق من الصلاحيات"
      });
    }

  }

}

module.exports = {
  requireAdminRole: requireRole('مدير'),
  requireBranchManagerRole: requireRole('مدير فرع'),
  requireGeneralSupervisorRole: requireRole('مشرف عام'),
  requireSupervisorRole: requireRole('مشرف'),
  requireMarketerRole: requireRole('مسوق')
};