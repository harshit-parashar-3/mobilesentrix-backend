const db = require("./database");

const createTables = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS stores (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        store_id INTEGER REFERENCES stores(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(50) PRIMARY KEY,
        entity_id VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        sku VARCHAR(100) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        category_ids TEXT,
        image_url TEXT,
        description TEXT,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(50) PRIMARY KEY,
        entity_id VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        url_key VARCHAR(255),
        has_children BOOLEAN DEFAULT FALSE,
        parent_id VARCHAR(50),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        store_id INTEGER REFERENCES stores(id) ON DELETE SET NULL,
        status VARCHAR(20) DEFAULT 'pending',
        total_amount DECIMAL(10, 2) NOT NULL,
        shipping_address TEXT,
        billing_address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        product_id VARCHAR(50) REFERENCES products(id) ON DELETE SET NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("All tables created successfully");
  } catch (error) {
    console.error("Error creating tables", error);
  }
};

const seedAdmin = async () => {
  try {
    const bcrypt = require("bcrypt");
    const hashedPassword = await bcrypt.hash("admin123", 10);

    let adminStore = null;
    const storeResult = await db.query("SELECT * FROM stores WHERE name = $1", [
      "Admin Store",
    ]);

    if (storeResult.rows.length === 0) {
      const newStoreResult = await db.query(
        "INSERT INTO stores (name, description) VALUES ($1, $2) RETURNING *",
        ["Admin Store", "Default store for admin user"]
      );
      adminStore = newStoreResult.rows[0];
      console.log("Admin store created successfully");
    } else {
      adminStore = storeResult.rows[0];
      console.log("Admin store already exists");
    }

    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      "admin@example.com",
    ]);

    if (result.rows.length === 0) {
      await db.query(
        "INSERT INTO users (email, password, first_name, last_name, role, store_id) VALUES ($1, $2, $3, $4, $5, $6)",
        [
          "admin@example.com",
          hashedPassword,
          "Admin",
          "User",
          "admin",
          adminStore.id,
        ]
      );
      console.log("Admin user seeded successfully");
    } else {
      console.log("Admin user already exists");
    }
  } catch (error) {
    console.error("Error seeding admin user", error);
  }
};

const initialize = async () => {
  await createTables();
  await seedAdmin();
};

module.exports = { initialize };
