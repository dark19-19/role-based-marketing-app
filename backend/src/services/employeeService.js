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
      const existingEmployee = await employeeRepo.findByUserId(userId);
      if(existingEmployee) {
        await employeeRepo.updateIsActive(existingEmployee.id, true, client);
        await employeeRepo.updateBranch(existingEmployee.id, branchId, client);
        await employeeRepo.updateSupervisor(finalSupervisor, existingEmployee.id, client)
        return true;
      } else {
        const newEmployeeId = randomUUID();
        return await employeeRepo.create({
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
          `تم تحويل حسابك إلى موظف بنجاح. مرحباً بك في الفريق!`
        );
      } catch (notifyErr) {
        console.error("[EmployeeService] Notification error (ignored):", notifyErr.message);
      }

      return {
        success: true,
        message: "Customer converted to employee successfully",
      };
    });
  }
}

module.exports = new EmployeeService();
