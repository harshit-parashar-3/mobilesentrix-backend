const db = require("../config/database");

const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { items, shippingAddress, billingAddress } = req.body;

    const userStore = await db.query(
      "SELECT store_id FROM users WHERE id = $1",
      [userId]
    );

    if (!userStore.rows[0].store_id) {
      return res
        .status(400)
        .json({ message: "User does not belong to a store" });
    }

    const storeId = userStore.rows[0].store_id;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Order items are required" });
    }

    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const { productId, quantity } = item;

      if (!productId || !quantity || quantity <= 0) {
        return res.status(400).json({ message: "Invalid product or quantity" });
      }

      const productResult = await db.query(
        "SELECT * FROM products WHERE id = $1",
        [productId]
      );

      if (productResult.rows.length === 0) {
        return res
          .status(404)
          .json({ message: `Product with ID ${productId} not found` });
      }

      const product = productResult.rows[0];
      const price = parseFloat(product.price);
      const itemTotal = price * quantity;

      totalAmount += itemTotal;

      validatedItems.push({
        productId,
        quantity,
        unitPrice: price,
        totalPrice: itemTotal,
      });
    }

    const orderResult = await db.query(
      `INSERT INTO orders 
       (user_id, store_id, status, total_amount, shipping_address, billing_address)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, storeId, "pending", totalAmount, shippingAddress, billingAddress]
    );

    const order = orderResult.rows[0];

    for (const item of validatedItems) {
      await db.query(
        `INSERT INTO order_items 
         (order_id, product_id, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          order.id,
          item.productId,
          item.quantity,
          item.unitPrice,
          item.totalPrice,
        ]
      );
    }

    return res.status(201).json({
      message: "Order created successfully",
      order: {
        ...order,
        items: validatedItems,
      },
    });
  } catch (error) {
    console.error("Create order error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;
    const isAdmin = req.user.role === "admin";

    let query = `
      SELECT o.*, s.name as store_name, u.email as user_email
      FROM orders o
      JOIN stores s ON o.store_id = s.id
      JOIN users u ON o.user_id = u.id
    `;

    const queryParams = [];
    let paramCount = 1;

    const whereClauses = [];

    if (!isAdmin) {
      const userStoreResult = await db.query(
        "SELECT store_id FROM users WHERE id = $1",
        [userId]
      );

      if (!userStoreResult.rows[0].store_id) {
        return res.status(200).json({ orders: [] });
      }

      whereClauses.push(`o.store_id = $${paramCount++}`);
      queryParams.push(userStoreResult.rows[0].store_id);
    }

    if (status) {
      whereClauses.push(`o.status = $${paramCount++}`);
      queryParams.push(status);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(" AND ")}`;
    }

    query += " ORDER BY o.created_at DESC";

    const result = await db.query(query, queryParams);
    const orders = result.rows;

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const itemsResult = await db.query(
          `SELECT oi.*, p.name as product_name, p.sku as product_sku, p.image_url as product_image
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = $1`,
          [order.id]
        );

        return {
          ...order,
          items: itemsResult.rows,
        };
      })
    );

    return res.status(200).json({ orders: ordersWithItems });
  } catch (error) {
    console.error("Get orders error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";
    const orderResult = await db.query(
      `SELECT o.*, s.name as store_name, u.email as user_email
       FROM orders o
       JOIN stores s ON o.store_id = s.id
       JOIN users u ON o.user_id = u.id
       WHERE o.id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orderResult.rows[0];

    if (!isAdmin) {
      const userStoreResult = await db.query(
        "SELECT store_id FROM users WHERE id = $1",
        [userId]
      );

      if (
        !userStoreResult.rows[0].store_id ||
        userStoreResult.rows[0].store_id != order.store_id
      ) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const itemsResult = await db.query(
      `SELECT oi.*, p.name as product_name, p.sku as product_sku, p.image_url as product_image
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [orderId]
    );

    const items = itemsResult.rows;

    return res.status(200).json({
      order: {
        ...order,
        items,
      },
    });
  } catch (error) {
    console.error("Get order by ID error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const isAdmin = req.user.role === "admin";

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const validStatuses = [
      "pending",
      "approved",
      "rejected",
      "shipped",
      "delivered",
      "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const orderCheck = await db.query("SELECT * FROM orders WHERE id = $1", [
      orderId,
    ]);

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orderCheck.rows[0];

    if ((status === "approved" || status === "rejected") && !isAdmin) {
      return res
        .status(403)
        .json({ message: "Only admin can approve or reject orders" });
    }

    const result = await db.query(
      `UPDATE orders 
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, orderId]
    );

    const updatedOrder = result.rows[0];

    return res.status(200).json({
      message: "Order status updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Update order status error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
};
