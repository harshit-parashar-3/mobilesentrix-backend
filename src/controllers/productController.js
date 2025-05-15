const api = require("../utils/apiClient");
const db = require("../config/database");

const getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const products = await api.getProducts(page, limit);

    await cacheProducts(products);

    return res.status(200).json(products);
  } catch (error) {
    console.error("Get products error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getProductById = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await api.getProductById(productId);

    await cacheProduct(product);

    return res.status(200).json(product);
  } catch (error) {
    console.error("Get product by ID error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const cacheProducts = async (products) => {
  try {
    if (typeof products === "object" && !Array.isArray(products)) {
      for (const key in products) {
        await cacheProduct({ [key]: products[key] });
      }
    }
  } catch (error) {
    console.error("Cache products error:", error);
  }
};

const cacheProduct = async (productData) => {
  try {
    const productKey = Object.keys(productData)[0];
    const product = productData[productKey];

    if (!product || !product.entity_id) {
      return;
    }

    const categoryIds = Array.isArray(product.category_ids)
      ? product.category_ids.join(",")
      : "";

    const defaultImage = product.default_image || "";

    await db.query(
      `INSERT INTO products 
       (id, entity_id, name, sku, price, category_ids, image_url, last_updated)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (id) 
       DO UPDATE SET 
         name = $3,
         sku = $4,
         price = $5,
         category_ids = $6,
         image_url = $7,
         last_updated = NOW()`,
      [
        productKey,
        product.entity_id,
        product.name,
        product.sku,
        parseFloat(product.price) || 0,
        categoryIds,
        defaultImage,
      ]
    );
  } catch (error) {
    console.error("Cache product error:", error);
  }
};

module.exports = {
  getProducts,
  getProductById,
};
