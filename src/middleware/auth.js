const jwt = require("jsonwebtoken");
const db = require("../config/database");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await db.query("SELECT * FROM users WHERE id = $1", [
      decoded.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    const user = result.rows[0];
    delete user.password;

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }

    return res.status(401).json({ message: "Invalid token" });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }

  return res.status(403).json({ message: "Admin access required" });
};

const belongsToStore = async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const userId = req.user.id;

    if (req.user.role === "admin") {
      return next();
    }

    const result = await db.query(
      "SELECT * FROM users WHERE id = $1 AND store_id = $2",
      [userId, storeId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ message: "Access denied" });
    }

    next();
  } catch (error) {
    console.error("Store access check error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  authenticate,
  isAdmin,
  belongsToStore,
};
