const express = require("express");
const router = express.Router();
const storeController = require("../controllers/storeController");
const { authenticate, belongsToStore, isAdmin } = require("../middleware/auth");

router.use(authenticate);

router.post("/", storeController.createStore);
router.get("/", storeController.getStores);
router.get("/:storeId", belongsToStore, storeController.getStoreById);
router.put("/:storeId", belongsToStore, storeController.updateStore);
router.post("/:storeId/users", isAdmin, storeController.addUserToStore);
router.delete(
  "/:storeId/users/:userId",
  isAdmin,
  storeController.removeUserFromStore
);

module.exports = router;
