const db = require("./database");

async function migrateToSingleStore() {
  try {
    console.log("Starting migration to single store per user model...");
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_stores'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.log("user_stores table does not exist. Migration not needed.");
      return;
    }
    const columnExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'store_id'
      );
    `);

    if (!columnExists.rows[0].exists) {
      console.log("Adding store_id column to users table...");
      await db.query(`
        ALTER TABLE users 
        ADD COLUMN store_id INTEGER REFERENCES stores(id) ON DELETE SET NULL;
      `);
    }

    const users = await db.query("SELECT id FROM users");

    for (const user of users.rows) {
      const userStores = await db.query(
        "SELECT store_id FROM user_stores WHERE user_id = $1 LIMIT 1",
        [user.id]
      );

      if (userStores.rows.length > 0) {
        await db.query("UPDATE users SET store_id = $1 WHERE id = $2", [
          userStores.rows[0].store_id,
          user.id,
        ]);
        console.log(
          `User ${user.id} associated with store ${userStores.rows[0].store_id}`
        );
      }
    }

    console.log("Dropping user_stores table...");
    await db.query("DROP TABLE IF EXISTS user_stores");

    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await db.pool.end();
  }
}

if (require.main === module) {
  migrateToSingleStore()
    .then(() => console.log("Migration process completed"))
    .catch((err) => console.error("Migration process failed:", err));
}

module.exports = { migrateToSingleStore };
