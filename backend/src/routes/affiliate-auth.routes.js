const express = require("express");
const affiliateAuth = require("../controllers/affiliate-auth.controller");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const { asyncHandler } = require("../middleware/async-handler");

const router = express.Router();

router.post("/register", express.json(), asyncHandler(affiliateAuth.register));
router.post("/login", express.json(), asyncHandler(affiliateAuth.login));
router.get("/ref/:code", asyncHandler(affiliateAuth.resolveRef));
router.get(
  "/me",
  requireAuth,
  requireRole("affiliate"),
  asyncHandler(affiliateAuth.me)
);

module.exports = router;
