const employeeService = require("../services/employeeService");
const salaryRequestService = require("../services/salaryRequestService");
const userRepo = require("../data/userRepository");
const authRepo = require("../data/authRepository");
const roleRepo = require("../data/roleRepository");
const bcrypt = require("bcrypt");
const { randomUUID } = require("crypto");

class EmployeeController {
  create = async (req, res) => {
    try {
      // استقبال البيانات من عندي
      const {
        first_name,
        last_name,
        phone,
        password,
        role,
        branchId,
        supervisorId,
      } = req.body || {};

      if (!first_name || !last_name || !phone || !password || !role) {
        throw new Error(
          "الاسم الأول، الكنية، رقم الهاتف، كلمة المرور، والدور مطلوبة",
        );
      }

      const existing = await authRepo.findUserByPhone(phone);
      if (existing) {
        throw new Error("رقم الهاتف مستخدم مسبقاً");
      }

      const roleData = await roleRepo.findByName(role);
      if (!roleData) {
        throw new Error("الدور المحدد غير موجود");
      }

      //  انشاء المستخدم الجديد
      const passwordHash = await bcrypt.hash(password, 10);
      const userId = randomUUID();

      await userRepo.createUser({
        id: userId,
        first_name,
        last_name,
        phone,
        passwordHash,
        role_id: roleData.id,
      });

      // انشار الموظف المرتبط بالمستخدم
      const employeeResult = await employeeService.createEmployee({
        userId,
        role,
        branchId,
        supervisorId,
      });

      res.status(201).json({
        success: true,
        body: {
          id: userId,
          first_name,
          last_name,
          phone,
          role,
          employee_id: employeeResult.id,
        },
        message: "تم إنشاء الموظف بنجاح",
      });
    } catch (err) {
      console.error("Create employee error:", err);
      res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  };

  // باقي الدوال كما هي دون تغيير
  list = async (req, res) => {
    try {
      const { page, limit, search, role, supervisorId } = req.query;

      const result = await employeeService.listEmployees({
        page,
        limit,
        search,
        role,
        supervisorId,
        branchId: req.query.branchId,
        user: req.user,
      });

      res.json({
        success: true,
        body: result,
        message: "تم جلب قائمة الموظفين",
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  };

  getDetails = async (req, res) => {
    try {
      const { id } = req.params;

      const result = await employeeService.getEmployeeDetails(id);

      res.json({
        success: true,
        body: result,
        message: "تم جلب تفاصيل الموظف",
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  };

  getHierarchy = async (req, res) => {
    try {
      const { root_id } = req.query;

      const result = await employeeService.getHierarchy(root_id);

      res.json({
        success: true,
        body: result,
        message: "تم جلب الهيكلية التنظيمية",
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  };

  async update(req, res) {
    try {
      const result = await employeeService.updateEmployee({
        employeeId: req.params.id,
        payload: req.body,
        user: req.user,
      });

      res.json({
        success: true,
        body: result,
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  }

  // async remove(req, res) {
  //   try {
  //     const result = await employeeService.removeEmployee(req.params.id);
  //
  //     res.json({
  //       success: true,
  //       body: result,
  //       message: "تم تحويل الموظف إلى عميل بنجاح"
  //     });
  //   } catch (err) {
  //     res.status(400).json({
  //       success: false,
  //       message: err.message,
  //     });
  //   }
  // }

  async apply(req, res) {
    try {
      const { userId, role, branchId, supervisorId } = req.body;

      if (!userId || !role || !branchId) {
        throw new Error("userId, role, and branchId are required");
      }

      const result = await employeeService.applyEmployee(
        userId,
        role,
        branchId,
        supervisorId
      );

      res.status(200).json({
        success: true,
        body: result,
        message: "تم تحويل العميل إلى موظف بنجاح"
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: err.message
      });
    }
  }

  async promote(req, res) {
    try {
      const result = await employeeService.promoteEmployee(req.params.id);

      res.status(200).json({
        success: true,
        body: result,
        message: "تم ترقيت الموظف بنجاح"
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: err.message
      });
    }
  }

  async demote(req, res) {
    try {
      const { newSupervisorId } = req.body;
      const result = await employeeService.demoteEmployee(req.params.id, newSupervisorId);

      res.status(200).json({
        success: true,
        body: result,
        message: "تم تخفيض الموظف بنجاح"
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: err.message
      });
    }
  }
  async remove(req, res) {
    try {
      const { successorId } = req.body || {};
      const result = await employeeService.removeEmployee(req.params.id, successorId);

      res.json({
        success: true,
        body: result,
        message: "تم تحويل الموظف إلى عميل بنجاح"
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  }

}

module.exports = new EmployeeController();
