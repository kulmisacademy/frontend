const express = require("express");
const admin = require("../controllers/admin.controller");
const affiliateAdmin = require("../controllers/affiliate-admin.controller");

const router = express.Router();

router.get("/plans", admin.listPlans);
router.post("/plans", express.json(), admin.createPlan);
router.patch("/plans/:id", express.json(), admin.updatePlan);
router.delete("/plans/:id", admin.deletePlan);

router.get("/stats", admin.stats);
router.get("/users", admin.users);
router.get("/stores", admin.stores);
router.get("/stores/:id", admin.storeById);
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

router.get("/affiliates", affiliateAdmin.listAffiliates);
router.get("/affiliate-referrals", affiliateAdmin.listReferredStores);
router.get("/affiliate-settings", affiliateAdmin.getAffiliateSettings);
router.patch(
  "/affiliate-settings",
  express.json(),
  affiliateAdmin.patchAffiliateSettings
);
router.get("/affiliate-withdrawals", affiliateAdmin.listWithdrawals);
router.post(
  "/affiliate-withdrawals/:id/approve",
  affiliateAdmin.approveWithdrawal
);
router.post(
  "/affiliate-withdrawals/:id/reject",
  express.json(),
  affiliateAdmin.rejectWithdrawal
);
router.post(
  "/affiliate-withdrawals/:id/paid",
  affiliateAdmin.markWithdrawalPaid
);
router.post(
  "/affiliates/:id/manual-bonus",
  express.json(),
  affiliateAdmin.manualBonus
);
router.post(
  "/affiliate-referrals/:id/reject",
  express.json(),
  affiliateAdmin.rejectReferral
);

module.exports = router;
