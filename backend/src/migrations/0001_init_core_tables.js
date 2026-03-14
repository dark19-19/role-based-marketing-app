const db = require('../helpers/DBHelper');

module.exports = {
  name: '0001_init_core_tables',
  up: async () => {
    await db.runInTransaction(async (client) => {

      // migrations table for tracking applied files
      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          applied_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

           // roles
      await client.query(`
        CREATE TABLE IF NOT EXISTS roles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) UNIQUE NOT NULL,
          deleted_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP
        );
      `);


      // users
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY,
          phone TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          role_id UUID REFERENCES roles(id),
          is_active BOOLEAN DEFAULT true,
          last_login TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP
        );
      `);

  

      // jwt_tokens
      await client.query(`
        CREATE TABLE IF NOT EXISTS jwt_tokens (
          id UUID PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token TEXT NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          revoked BOOLEAN NOT NULL DEFAULT FALSE
        );
      `);


      // governorates
      await client.query(`
        CREATE TABLE IF NOT EXISTS governorates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL UNIQUE,
          deleted_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP
        );
      `);

      // branches
      await client.query(`
        CREATE TABLE IF NOT EXISTS branches (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          governorate_id UUID NOT NULL,
          deleted_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP,
          FOREIGN KEY (governorate_id) REFERENCES governorates(id) ON DELETE CASCADE
        );
      `);

      // employees
      await client.query(`
        CREATE TABLE IF NOT EXISTS employees (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          branch_id UUID REFERENCES branches(id),
          supervisor_id UUID REFERENCES employees(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // customers
      await client.query(`
        CREATE TABLE IF NOT EXISTS customers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          governorate_id UUID REFERENCES governorates(id),
          referred_by UUID REFERENCES employees(id),
          first_marketer_id UUID REFERENCES employees(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // categories
      await client.query(`
        CREATE TABLE IF NOT EXISTS categories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) UNIQUE NOT NULL,
          deleted_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // products
      await client.query(`
        CREATE TABLE IF NOT EXISTS products (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price NUMERIC(12,2) NOT NULL,
          quantity INT NOT NULL,
          in_stock BOOLEAN DEFAULT TRUE,
          is_active BOOLEAN DEFAULT TRUE,
          category_id UUID,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP,
          updated_at TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories(id)
        );
      `);

      // product_images
      await client.query(`
        CREATE TABLE IF NOT EXISTS product_images (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          product_id UUID REFERENCES products(id) ON DELETE CASCADE,
          image_url TEXT NOT NULL,
          sort_order INT DEFAULT 0
        );
      `);

      // commission_settings
      await client.query(`
        CREATE TABLE IF NOT EXISTS commission_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          product_id UUID REFERENCES products(id),
          company_percentage NUMERIC(5,2),
          general_supervisor_percentage NUMERIC(5,2),
          supervisor_percentage NUMERIC(5,2),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // orders
      await client.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          customer_id UUID REFERENCES customers(id),
          marketer_id UUID REFERENCES employees(id),
          branch_id UUID REFERENCES branches(id),
          status VARCHAR(255) DEFAULT 'pending',
          total_main_price NUMERIC(12,2),
          total_sold_price NUMERIC(12,2),
          notes TEXT,
          branch_note TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // order_items
      await client.query(`
        CREATE TABLE IF NOT EXISTS order_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
          product_id UUID REFERENCES products(id),
          quantity INT NOT NULL,
          main_price NUMERIC(12,2),
          sold_price NUMERIC(12,2)
        );
      `);

      // order_commissions
      await client.query(`
        CREATE TABLE IF NOT EXISTS order_commissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          order_id UUID UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
          company_amount NUMERIC(12,2),
          general_supervisor_amount NUMERIC(12,2),
          supervisor_amount NUMERIC(12,2),
          marketer_amount NUMERIC(12,2),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // wallet_transactions
      await client.query(`
        CREATE TABLE IF NOT EXISTS wallet_transactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_id UUID REFERENCES employees(id),
          order_id UUID REFERENCES orders(id),
          amount NUMERIC(12,2) NOT NULL,
          type VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // salary_requests
      await client.query(`
        CREATE TABLE IF NOT EXISTS salary_requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_id UUID REFERENCES employees(id),
          requested_amount NUMERIC(12,2),
          status VARCHAR(255) DEFAULT 'PENDING',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // notifications
      await client.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id),
          title VARCHAR(255),
          message TEXT,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

    });
  },
  down: async () => {
    await db.runInTransaction(async (client) => {

      await client.query(`DROP TABLE IF EXISTS notifications CASCADE;`);

      await client.query(`DROP TABLE IF EXISTS salary_requests CASCADE;`);

      await client.query(`DROP TABLE IF EXISTS wallet_transactions CASCADE;`);

      await client.query(`DROP TABLE IF EXISTS order_commissions CASCADE;`);

      await client.query(`DROP TABLE IF EXISTS order_items CASCADE;`);

      await client.query(`DROP TABLE IF EXISTS orders CASCADE;`);

      await client.query(`DROP TABLE IF EXISTS commission_settings CASCADE;`);

      await client.query(`DROP TABLE IF EXISTS product_images CASCADE;`);

      await client.query(`DROP TABLE IF EXISTS products CASCADE;`);

      await client.query(`DROP TABLE IF EXISTS categories CASCADE;`);

      await client.query(`DROP TABLE IF EXISTS customers CASCADE;`);

      await client.query(`DROP TABLE IF EXISTS employees CASCADE;`);

      await client.query(`DROP TABLE IF EXISTS branches CASCADE;`);

      await client.query(`DROP TABLE IF EXISTS governorates CASCADE;`);

      await client.query(`DROP TABLE IF EXISTS jwt_tokens CASCADE;`);

      await client.query(`DROP TABLE IF EXISTS users CASCADE;`);

      await client.query(`DROP TABLE IF EXISTS roles CASCADE;`);

      await client.query(`DROP TABLE IF EXISTS migrations CASCADE;`);

    });
  }
};