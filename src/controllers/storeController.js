const db = require("../config/database");

const createStore = async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ message: "Store name is required" });
    }

    const userCheck = await db.query(
      "SELECT store_id FROM users WHERE id = $1",
      [userId]
    );

    if (userCheck.rows[0].store_id) {
      return res
        .status(400)
        .json({ message: "User already has a store association" });
    }

    const storeResult = await db.query(
      "INSERT INTO stores (name, description) VALUES ($1, $2) RETURNING *",
      [name, description]
    );

    const store = storeResult.rows[0];

    await db.query("UPDATE users SET store_id = $1 WHERE id = $2", [
      store.id,
      userId,
    ]);

    return res.status(201).json({
      message: "Store created successfully",
      store,
    });
  } catch (error) {
    console.error("Create store error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getStores = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";

    let stores;

    if (isAdmin) {
      const result = await db.query("SELECT * FROM stores ORDER BY name");
      stores = result.rows;
    } else {
      const result = await db.query(
        `SELECT s.*
         FROM stores s
         JOIN users u ON s.id = u.store_id
         WHERE u.id = $1`,
        [req.user.id]
      );
      stores = result.rows;
    }

    return res.status(200).json({ stores });
  } catch (error) {
    console.error("Get stores error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getStoreById = async (req, res) => {
  try {
    const { storeId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isAdmin) {
      const accessCheck = await db.query(
        "SELECT store_id FROM users WHERE id = $1",
        [userId]
      );

      if (
        !accessCheck.rows[0].store_id ||
        accessCheck.rows[0].store_id != storeId
      ) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const storeResult = await db.query("SELECT * FROM stores WHERE id = $1", [
      storeId,
    ]);

    if (storeResult.rows.length === 0) {
      return res.status(404).json({ message: "Store not found" });
    }

    const store = storeResult.rows[0];

    const usersResult = await db.query(
      `SELECT id, email, first_name, last_name, role
       FROM users
       WHERE store_id = $1`,
      [storeId]
    );

    const users = usersResult.rows;

    return res.status(200).json({
      store,
      users,
    });
  } catch (error) {
    console.error("Get store by ID error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const updateStore = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { name, description, status } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isAdmin) {
      const accessCheck = await db.query(
        "SELECT store_id FROM users WHERE id = $1",
        [userId]
      );

      if (
        !accessCheck.rows[0].store_id ||
        accessCheck.rows[0].store_id != storeId
      ) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const storeCheck = await db.query("SELECT * FROM stores WHERE id = $1", [
      storeId,
    ]);

    if (storeCheck.rows.length === 0) {
      return res.status(404).json({ message: "Store not found" });
    }

    const result = await db.query(
      `UPDATE stores 
       SET name = COALESCE($1, name), 
           description = COALESCE($2, description), 
           status = COALESCE($3, status),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [name, description, status, storeId]
    );

    const updatedStore = result.rows[0];

    return res.status(200).json({
      message: "Store updated successfully",
      store: updatedStore,
    });
  } catch (error) {
    console.error("Update store error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const addUserToStore = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { email } = req.body;
    const isAdmin = req.user.role === "admin";

    if (!isAdmin) {
      return res
        .status(403)
        .json({ message: "Only admin can add users to stores" });
    }

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const storeCheck = await db.query("SELECT * FROM stores WHERE id = $1", [
      storeId,
    ]);

    if (storeCheck.rows.length === 0) {
      return res.status(404).json({ message: "Store not found" });
    }

    const userResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userResult.rows[0];

    if (user.store_id) {
      return res
        .status(400)
        .json({ message: "User is already associated with a store" });
    }

    await db.query("UPDATE users SET store_id = $1 WHERE id = $2", [
      storeId,
      user.id,
    ]);

    return res.status(200).json({
      message: "User added to store successfully",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
      },
    });
  } catch (error) {
    console.error("Add user to store error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const removeUserFromStore = async (req, res) => {
  try {
    const { storeId, userId } = req.params;
    const isAdmin = req.user.role === "admin";

    if (!isAdmin) {
      return res
        .status(403)
        .json({ message: "Only admin can remove users from stores" });
    }

    const userCheck = await db.query(
      "SELECT * FROM users WHERE id = $1 AND store_id = $2",
      [userId, storeId]
    );

    if (userCheck.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "User is not associated with this store" });
    }

    await db.query("UPDATE users SET store_id = NULL WHERE id = $1", [userId]);

    return res.status(200).json({
      message: "User removed from store successfully",
    });
  } catch (error) {
    console.error("Remove user from store error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createStore,
  getStores,
  getStoreById,
  updateStore,
  addUserToStore,
  removeUserFromStore,
};
