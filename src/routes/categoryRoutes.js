const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

router.get("/", categoryController.getCategories);
router.get("/:categoryId", categoryController.getCategoryById);
router.get(
  "/subcategory/:categoryId",
  categoryController.getCategoryByCategory
);
module.exports = router;
