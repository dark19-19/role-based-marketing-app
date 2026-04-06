const { randomUUID } = require("crypto");
const employeeRepo = require("../data/employeeRepository");
const salaryRequestRepo = require("../data/salaryRequestRepository");
const customerRepo = require("../data/customerRepository");
const userRepo = require("../data/userRepository");
const roleRepo = require("../data/roleRepository");
const adminRepo = require("../data/adminRepository");
const db = require("../helpers/DBHelper");
const bcrypt = require("bcrypt");
const notificationHelper = require("../helpers/notificationHelper");

class EmployeeService {
  async createEmployee({ userId, role, branchId, supervisorId }) {
    try {
      let finalSupervisor = null;

      // Branch Manager
      if (role === "BRANCH_MANAGER") {
        finalSupervisor = null;
      }

      // General Supervisor
      if (role === "GENERAL_SUPERVISOR") {
        finalSupervisor = null;
      }

      // Supervisor
      if (role === "SUPERVISOR") {
        if (!supervisorId) {
          throw new Error("يجب تحديد المشرف العام");
        }

        const supervisor =
          await employeeRepo.findEmployeeWithRole(supervisorId);

        if (!supervisor) {
          throw new Error("المشرف غير موجود");
        }

        if (supervisor.role !== "GENERAL_SUPERVISOR") {
          throw new Error("المشرف يجب أن يكون مشرفاً عاماً");
        }

        finalSupervisor = supervisorId;
      }

      // Marketer
      if (role === "MARKETER") {
        if (!supervisorId) {
          throw new Error("يجب تحديد المشرف");
        }

        const supervisor =
          await employeeRepo.findEmployeeWithRole(supervisorId);

        if (!supervisor) {
          throw new Error("المشرف غير موجود");
        }

        if (
          supervisor.role !== "SUPERVISOR" &&
          supervisor.role !== "GENERAL_SUPERVISOR"
        ) {
          throw new Error("المشرف يجب أن يكون مشرفاً أو مشرفاً عاماً");
        }

        finalSupervisor = supervisorId;
      }

      const id = randomUUID();

      await employeeRepo.create({
        id,
        userId,
        branchId,
        supervisorId: finalSupervisor,
      });

      return { id };
    } catch (err) {
      throw err;
    }
  }

  async listEmployees({
    limit,
    page,
    search,
    role,
    supervisorId,
    branchId,
    user,
  }) {
    try {
      page = Number(page) || 1;
      limit = Number(limit) || 20;

      const offset = (page - 1) * limit;

      // If caller is a branch manager, restrict to their branch
      let effectiveBranchId = branchId;
      if (user && user.role === "BRANCH_MANAGER") {
        const manager = await employeeRepo.findByUserId(user.id);
        if (manager && manager.branch_id) effectiveBranchId = manager.branch_id;
      }

      const employees = await employeeRepo.getEmployees({
        limit,
        offset,
        search,
        role,
        supervisorId,
        branchId: effectiveBranchId,
      });

      const total = await employeeRepo.count({
        search,
        role,
        supervisorId,
        branchId: effectiveBranchId,
      });

      return {
        data: employees,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (err) {
      throw err;
    }
  }

  async getEmployeeDetails(employeeId) {
    try {
      // Get basic employee info
      const employee = await employeeRepo.getEmployeeDetails(employeeId);

      if (!employee) {
        throw new Error("الموظف غير موجود");
      }

      // Get supervisor
      const supervisor = await employeeRepo.getEmployeeSupervisor(employeeId);

      // Get general supervisor
      const generalSupervisor =
        await employeeRepo.getEmployeeGeneralSupervisor(employeeId);

      // Get orders
      const orders = await employeeRepo.getEmployeeOrders(employeeId);

      // Get order count
      const orderCount = await employeeRepo.getEmployeeOrdersCount(employeeId);

      // Get customers (referred by this employee)
      const customers = await employeeRepo.getEmployeeCustomers(employeeId);

      // Get salary (sum of wallet transactions)
      const salary = await employeeRepo.getEmployeeSalarySum(employeeId);

      // Get salary requests
      const salaryRequests =
        await salaryRequestRepo.findByEmployeeId(employeeId);

      return {
        // Employee basic info
        id: employee.id,
        // expose the underlying user id so admin can target the user's account
        user_id: employee.user_id,
        full_name: `${employee.first_name} ${employee.last_name}`,
        phone: employee.phone,
        is_active: employee.is_active,
        created_at: employee.created_at,

        // Branch info
        branch: {
          id: employee.branch_id,
          governorate: employee.branch_governorate,
        },

        // Role
        role: employee.role,

        // Supervisor info
        supervisor:
          supervisor && supervisor.id
            ? {
                id: supervisor.id,
                name: supervisor.supervisor_name,
                role: supervisor.supervisor_role,
              }
            : null,

        // General supervisor info
        general_supervisor:
          generalSupervisor && generalSupervisor.id
            ? {
                id: generalSupervisor.id,
                name: generalSupervisor.general_supervisor_name,
                role: generalSupervisor.general_supervisor_role,
              }
            : null,

        // Order stats
        orderCount,

        // Orders list
        orders: orders.map((order) => ({
          id: order.id,
          status: order.status,
          total_main_price: order.total_main_price,
          total_sold_price: order.total_sold_price,
          created_at: order.created_at,
          customer: order.customer_id
            ? {
                id: order.customer_id,
                name: order.customer_name,
                phone: order.customer_phone,
                governorate: order.governorate,
              }
            : null,
        })),

        // Salary
        salary,

        // Customers
        customers: customers.map((customer) => ({
          id: customer.id,
          name: customer.customer_name,
          phone: customer.phone,
          isActive: customer.is_active,
          governorate: customer.governorate,
          createdAt: customer.created_at,
        })),

        // Salary requests
        salary_requests: salaryRequests.map((request) => ({
          id: request.id,
          requested_amount: request.requested_amount,
          status: request.status,
          created_at: request.created_at,
        })),
      };
    } catch (err) {
      throw err;
    }
  }

  async updateEmployee({ employeeId, payload, user }) {
    return await db.runInTransaction(async (client) => {
      // 1️⃣ verify updater password
      const updater = await userRepo.findById(user.id);

      const valid = await bcrypt.compare(
        payload.current_password,
        updater.password,
      );

      if (!valid) {
        throw new Error("كلمة المرور غير صحيحة");
      }

      // 2️⃣ get employee
      const employee = await employeeRepo.findByIdWithUser(employeeId);

      if (!employee) {
        throw new Error("الموظف غير موجود");
      }

      // 3️⃣ branch manager restriction
      if (user.role === "BRANCH_MANAGER") {
        const managerEmployee = await employeeRepo.findByUserId(user.id);

        if (employee.branch_id !== managerEmployee.branch_id) {
          throw new Error("لا يمكنك تعديل موظف خارج فرعك");
        }
      }

      // 4️⃣ update branch
      if (payload.branch_id) {
        await employeeRepo.updateBranch(employeeId, payload.branch_id, client);
      }

      // 5️⃣ update phone
      if (payload.phone) {
        await employeeRepo.updatePhone(employee.user_id, payload.phone, client);
      }

      // 6️⃣ update password
      if (payload.password) {
        const hash = await bcrypt.hash(payload.password, 10);

        await employeeRepo.updatePassword(employee.user_id, hash, client);
      }

      return { message: "تم تحديث بيانات الموظف بنجاح" };
    });
  }

  async getHierarchy(rootId) {
    try {
      // Fetch all employees to build the tree in memory
      const { data: allEmployees } = await this.listEmployees({
        limit: 1000,
        page: 1,
      });

      // Map to the format needed for the tree
      const mappedEmployees = allEmployees.map((e) => ({
        id: e.id,
        name: e.name,
        role: e.role,
        phone: e.phone,
        status: e.is_active ? "ACTIVE" : "INACTIVE",
        supervisorId: e.supervisor_id || null,
      }));

      const buildTree = (parentId) => {
        return mappedEmployees
          .filter((e) => e.supervisorId === parentId)
          .map((e) => ({
            employee: e,
            subordinates: buildTree(e.id),
          }));
      };

      if (rootId) {
        const root = mappedEmployees.find((e) => e.id === rootId);
        if (!root) throw new Error("الموظف غير موجود");
        return [
          {
            employee: root,
            subordinates: buildTree(root.id),
          },
        ];
      } else {
        // Find top-level employees
        const topLevel = mappedEmployees.filter(
          (e) =>
            !e.supervisorId ||
            e.role === "BRANCH_MANAGER" ||
            e.role === "GENERAL_SUPERVISOR",
        );
        return topLevel.map((e) => ({
          employee: e,
          subordinates: buildTree(e.id),
        }));
      }
    } catch (err) {
      throw err;
    }
  }

  async removeEmployee(employeeId) {
    return await db.runInTransaction(async (client) => {
      // 1️⃣ Get employee details
      const employee = await employeeRepo.findById(employeeId);
      if (!employee) {
        throw new Error("Employee not found");
      }

      // 2️⃣ Check if employee is already inactive
      if (!employee.is_active) {
        throw new Error("Employee is already removed");
      }

      // 3️⃣ Get the branch and governorate for the new customer
      const branchInfo = await employeeRepo.getEmployeeBranch(employeeId);
      if (!branchInfo) {
        throw new Error("Employee branch not found");
      }

      // 4️⃣ Update employee is_active to false
      await employeeRepo.updateIsActive(employeeId, false, client);

      // 5️⃣ Update user's role to CUSTOMER
      const customerRole = await roleRepo.findByName("CUSTOMER");
      if (!customerRole) {
        throw new Error("Customer role not found");
      }

      await userRepo.updateRole(employee.user_id, customerRole.id, client);

      // 6️⃣ Check if user was a customer before (has an existing customer record)
      const existingCustomer = await customerRepo.findByUserId(employee.user_id);

      if (existingCustomer) {
        // If user was a customer before, just update is_active to true
        await customerRepo.updateIsActive(existingCustomer.id, true, client);
      } else {
        // If user was never a customer, create a new customer record
        await customerRepo.createWithClient(client, {
          user_id: employee.user_id,
          referred_by: null,
          first_marketer_id: null,
          governorate_id: branchInfo.governorate_id,
          is_active: true
        });
      }

      // 7️⃣ Update wallet transactions from BALANCE to WITHDREW
      await employeeRepo.updateWalletTransactionsToWithdrew(employeeId, client);

      // 8️⃣ Notify the user
      try {
        await notificationHelper.notify(
          employee.user_id,
          "تم تحويل حسابك إلى عميل",
          "تم تحويل حسابك من موظف إلى عميل بنجاح."
        );
      } catch (notifyErr) {
        console.error("[EmployeeService] Notification error (ignored):", notifyErr.message);
      }

      return {
        success: true,
        message: "Employee removed and converted to customer successfully"
      };
    });
  }

  async applyEmployee(userId, role, branchId, supervisorId) {
    return await db.runInTransaction(async (client) => {
      // 1️⃣ Get user details
      const user = await userRepo.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // 2️⃣ Check if user is already an active employee
      const existingEmployeeActive = await employeeRepo.findByUserIdWithActive(userId);
      if (existingEmployeeActive) {
        throw new Error("User is already an active employee");
      }

      // 3️⃣ Check if user has a customer record
      const existingCustomer = await customerRepo.findByUserId(userId);
      if (!existingCustomer) {
        throw new Error("User does not have a customer record");
      }

      // 4️⃣ Update customer's is_active to false
      await customerRepo.updateIsActive(existingCustomer.id, false, client);

      // 5️⃣ Update user's role to the new employee role
      const roleData = await roleRepo.findByName(role);
      if (!roleData) {
        throw new Error("Role not found");
      }

      await userRepo.updateRole(userId, roleData.id, client);

      // 6️⃣ Create new employee record
      let finalSupervisor = null;

      // Determine supervisor based on role
      if (role === "BRANCH_MANAGER" || role === "GENERAL_SUPERVISOR") {
        finalSupervisor = null;
      } else if (role === "SUPERVISOR") {
        if (!supervisorId) {
          throw new Error("Supervisor ID is required for supervisor role");
        }
        finalSupervisor = supervisorId;
      } else if (role === "MARKETER") {
        if (!supervisorId) {
          throw new Error("Supervisor ID is required for marketer role");
        }
        finalSupervisor = supervisorId;
      }

      // Check if employee record already exists (inactive)
      const existingEmployee = await employeeRepo.findByUserId(userId);
      let newEmployeeId;

      if (existingEmployee) {
        // Reactivate existing employee
        await employeeRepo.updateIsActive(existingEmployee.id, true, client);
        await employeeRepo.updateBranch(existingEmployee.id, branchId, client);
        await employeeRepo.updateSupervisor(existingEmployee.id, finalSupervisor, client);
        newEmployeeId = existingEmployee.id;
      } else {
        // Create new employee
        newEmployeeId = randomUUID();
        await employeeRepo.create({
          id: newEmployeeId,
          userId: userId,
          branchId: branchId,
          supervisorId: finalSupervisor
        });
      }

      // 7️⃣ Notify the user
      try {
        await notificationHelper.notify(
          userId,
          "تم تحويل حسابك إلى موظف",
          `تم تحويل حسابك إلى ${role} بنجاح. مرحباً بك في الفريق!`
        );
      } catch (notifyErr) {
        console.error("[EmployeeService] Notification error (ignored):", notifyErr.message);
      }

      return {
        success: true,
        message: "Customer converted to employee successfully",
        employeeId: newEmployeeId
      };
    });
  }

  async promoteEmployee(employeeId) {
    return await db.runInTransaction(async (client) => {
      // 1️⃣ Get employee details with role
      const employee = await employeeRepo.findById(employeeId);
      if (!employee) {
        throw new Error("Employee not found");
      }

      if (!employee.is_active) {
        throw new Error("Employee is not active");
      }

      // Get employee's role
      const employeeWithRole = await employeeRepo.findEmployeeWithRole(employeeId);
      const currentRole = employeeWithRole.role;

      // 2️⃣ Determine the new role based on current role
      let newRole = null;
      let newSupervisorId = null;

      if (currentRole === "MARKETER") {
        // Promote MARKETER to SUPERVISOR
        // New supervisor should be the grandfather (supervisor's supervisor)
        const supervisor = await employeeRepo.getEmployeeSupervisor(employeeId);
        if (supervisor && supervisor.supervisor_role === "GENERAL_SUPERVISOR") {
          // The supervisor is under a general supervisor
          // Marketer -> Supervisor -> General Supervisor
          // When promoting, the marketer becomes a supervisor under the same GS
          newRole = "SUPERVISOR";
          newSupervisorId = supervisor.id;
        } else if (supervisor && supervisor.supervisor_role === "SUPERVISOR") {
          // Get the general supervisor (grandfather)
          const gs = await employeeRepo.getEmployeeGeneralSupervisor(employeeId);
          if (gs && gs.id) {
            newRole = "SUPERVISOR";
            newSupervisorId = gs.id;
          } else {
            newRole = "SUPERVISOR";
            newSupervisorId = null;
          }
        } else {
          newRole = "SUPERVISOR";
          newSupervisorId = null;
        }
      } else if (currentRole === "SUPERVISOR") {
        // Promote SUPERVISOR to GENERAL_SUPERVISOR
        newRole = "GENERAL_SUPERVISOR";
        newSupervisorId = null; // General supervisors have no supervisor
      } else if (currentRole === "GENERAL_SUPERVISOR") {
        throw new Error("General supervisor cannot be promoted further");
      } else {
        throw new Error("This role cannot be promoted");
      }

      // 3️⃣ Update user's role
      const roleData = await roleRepo.findByName(newRole);
      if (!roleData) {
        throw new Error("Role not found");
      }

      await userRepo.updateRole(employee.user_id, roleData.id, client);

      // 4️⃣ Update employee's supervisor
      await employeeRepo.updateSupervisor(employeeId, newSupervisorId, client);

      // 5️⃣ Notify the employee
      try {
        await notificationHelper.notify(
          employee.user_id,
          "تم ترقيتك",
          `تم ترقيتك إلى ${newRole} بنجاح. تهانينا!`
        );
      } catch (notifyErr) {
        console.error("[EmployeeService] Notification error (ignored):", notifyErr.message);
      }

      return {
        success: true,
        message: `Employee promoted to ${newRole} successfully`,
        newRole
      };
    });
  }

  async demoteEmployee(employeeId, newSupervisorId) {
    return await db.runInTransaction(async (client) => {
      // 1️⃣ Get employee details with role
      const employee = await employeeRepo.findById(employeeId);
      if (!employee) {
        throw new Error("Employee not found");
      }

      if (!employee.is_active) {
        throw new Error("Employee is not active");
      }

      // Get employee's role
      const employeeWithRole = await employeeRepo.findEmployeeWithRole(employeeId);
      const currentRole = employeeWithRole.role;

      // 2️⃣ Determine the new role based on current role
      let newRole = null;
      let finalNewSupervisorId = null;

      if (currentRole === "GENERAL_SUPERVISOR") {
        // Demote GENERAL_SUPERVISOR to SUPERVISOR
        // Need to specify the new supervisor (must be a GENERAL_SUPERVISOR)
        if (!newSupervisorId) {
          throw new Error("New supervisor ID is required when demoting to supervisor");
        }

        // Verify the new supervisor exists and is a GENERAL_SUPERVISOR
        const supervisorToBe = await employeeRepo.findEmployeeWithRole(newSupervisorId);
        if (!supervisorToBe) {
          throw new Error("New supervisor not found");
        }
        if (supervisorToBe.role !== "GENERAL_SUPERVISOR") {
          throw new Error("New supervisor must be a general supervisor");
        }

        newRole = "SUPERVISOR";
        finalNewSupervisorId = newSupervisorId;
      } else if (currentRole === "SUPERVISOR") {
        // Demote SUPERVISOR to MARKETER
        // Two options:
        // 1. If newSupervisorId provided: use that
        // 2. If empty: use the same general supervisor that was above before demotion
        
        if (newSupervisorId) {
          // Verify the new supervisor exists
          const newSupervisor = await employeeRepo.findEmployeeWithRole(newSupervisorId);
          if (!newSupervisor) {
            throw new Error("New supervisor not found");
          }
          if (newSupervisor.role !== "GENERAL_SUPERVISOR" && newSupervisor.role !== "SUPERVISOR") {
            throw new Error("New supervisor must be a general supervisor or supervisor");
          }
          finalNewSupervisorId = newSupervisorId;
        } else {
          // Use the same general supervisor that was above before demotion
          const gs = await employeeRepo.getEmployeeGeneralSupervisor(employeeId);
          if (gs && gs.id) {
            finalNewSupervisorId = gs.id;
          } else {
            throw new Error("Cannot demote without specifying a supervisor");
          }
        }

        newRole = "MARKETER";
      } else if (currentRole === "MARKETER") {
        throw new Error("Marketer cannot be demoted further");
      } else {
        throw new Error("This role cannot be demoted");
      }

      // 3️⃣ Update user's role
      const roleData = await roleRepo.findByName(newRole);
      if (!roleData) {
        throw new Error("Role not found");
      }

      await userRepo.updateRole(employee.user_id, roleData.id, client);

      // 4️⃣ Update employee's supervisor
      await employeeRepo.updateSupervisor(employeeId, finalNewSupervisorId, client);

      // 5️⃣ Notify the employee
      try {
        await notificationHelper.notify(
          employee.user_id,
          "تم تخفيضك",
          `تم تخفيضك إلى ${newRole}. نرجو منك الاستمرار في العمل بنفس الجدية.`
        );
      } catch (notifyErr) {
        console.error("[EmployeeService] Notification error (ignored):", notifyErr.message);
      }

      return {
        success: true,
        message: `Employee demoted to ${newRole} successfully`,
        newRole
      };
    });
  }
}

module.exports = new EmployeeService();
