const express = require("express");
const auth = require("../controllers/auth.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { uploadLogo } = require("../middleware/upload.middleware");
const { asyncHandler } = require("../middleware/async-handler");

const router = express.Router();

router.post("/register-customer", asyncHandler(auth.registerCustomer));

router.post(
  "/register-vendor",
  (req, res, next) => {
    uploadLogo(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message || "Invalid file" });
      }
      next();
    });
  },
  asyncHandler(auth.registerVendor)
);

router.post("/login", asyncHandler(auth.login));
router.post("/forgot-password", asyncHandler(auth.forgotPassword));
router.post("/reset-password", asyncHandler(auth.resetPassword));
router.get("/me", requireAuth, asyncHandler(auth.me));
router.get(
  "/customer-orders",
  requireAuth,
  asyncHandler(auth.customerOrders)
);

router.post(
  "/orders/:id/rate",
  requireAuth,
  express.json({ limit: "32kb" }),
  asyncHandler(auth.rateOrder)
);

router.post("/follow/:slug", requireAuth, asyncHandler(auth.followStore));
router.delete("/follow/:slug", requireAuth, asyncHandler(auth.unfollowStore));
router.get("/follow/:slug", requireAuth, asyncHandler(auth.followStatus));
router.get("/followed-stores", requireAuth, asyncHandler(auth.followedStores));

module.exports = router;
