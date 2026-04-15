const express = require("express");
const multer = require("multer");
const vendor = require("../controllers/vendor.controller");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const productUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024 },
}).fields([
  { name: "images", maxCount: 5 },
  { name: "video", maxCount: 1 },
]);

const storeUpload = upload.fields([
  { name: "logo", maxCount: 1 },
  { name: "banner", maxCount: 1 },
]);

const router = express.Router();

router.get("/overview", vendor.overview);
router.get("/plan", vendor.getPlanUsage);
router.get("/plan-catalog", vendor.listPlanCatalog);
router.post(
  "/subscription-request",
  express.json(),
  vendor.createSubscriptionRequest
);
router.get("/store", vendor.getMyStore);
router.patch("/store", express.json(), vendor.patchMyStoreJson);
router.post("/store", storeUpload, vendor.updateMyStore);
router.get("/products", vendor.listProducts);
router.get("/products/:id", vendor.getProduct);
router.post("/products", productUpload, vendor.createProduct);
router.patch("/products/:id", productUpload, vendor.updateProduct);
router.delete("/products/:id", vendor.deleteProduct);
router.get("/orders", vendor.listOrders);
router.patch("/orders/:id", express.json(), vendor.patchOrder);

module.exports = router;
