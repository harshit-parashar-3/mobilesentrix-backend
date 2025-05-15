const api = require("../utils/apiClient");
const db = require("../config/database");

const getCategories = async (req, res) => {
  try {
    const categories = await api.getCategories();
    await cacheCategories(categories);

    return res.status(200).json(categories);
  } catch (error) {
    console.error("Get categories error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getCategoryByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const sabcategory = await api.getProductsByCategory(
      categoryId,
      page,
      limit
    );

    await cacheCategories(sabcategory);

    return res.status(200).json(sabcategory);
  } catch (error) {
    console.error("Get sabcategory by category error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const category = await api.getCategoryById(categoryId);
    await cacheCategories(category);

    return res.status(200).json(category);
  } catch (error) {
    console.error("Get category by ID error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const cacheCategories = async (categories) => {
  try {
    if (!Array.isArray(categories)) {
      console.error("Invalid categories format");
      return;
    }

    for (const category of categories) {
      await cacheCategory(category);
    }
  } catch (error) {
    console.error("Cache categories error:", error);
  }
};

const cacheCategory = async (category) => {
  try {
    if (!category || !category.entity_id) {
      return;
    }

    await db.query(
      `INSERT INTO categories 
       (id, entity_id, name, url_key, has_children, last_updated)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (id) 
       DO UPDATE SET 
         name = $3,
         url_key = $4,
         has_children = $5,
         last_updated = NOW()`,
      [
        category.entity_id,
        category.entity_id,
        category.name,
        category.url_key,
        category.has_children || false,
      ]
    );
  } catch (error) {
    console.error("Cache category error:", error);
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  getCategoryByCategory,
};
