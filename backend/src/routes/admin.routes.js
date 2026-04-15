const express = require("express");
const admin = require("../controllers/admin.controller");

const router = express.Router();

router.get("/plans", admin.listPlans);
router.post("/plans", express.json(), admin.createPlan);
router.patch("/plans/:id", express.json(), admin.updatePlan);
router.delete("/plans/:id", admin.deletePlan);

router.get("/stats", admin.stats);
router.get("/users", admin.users);
router.get("/stores", admin.stores);
router.patch("/stores/:id", express.json(), admin.patchStore);
router.delete("/stores/:id", admin.deleteStore);
router.get("/subscription-requests", admin.subscriptionRequests);
router.post(
  "/subscription-requests/:id/approve",
  admin.approveSubscriptionRequest
);
router.post(
  "/subscription-requests/:id/reject",
  admin.rejectSubscriptionRequest
);
router.get("/products", admin.products);
router.get("/orders", admin.orders);

module.exports = router;
