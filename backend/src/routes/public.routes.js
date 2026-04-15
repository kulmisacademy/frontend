const express = require("express");
const rateLimit = require("express-rate-limit");
const publicCtrl = require("../controllers/public.controller");
const { attachUserIfPresent } = require("../middleware/auth.middleware");

const router = express.Router();

const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/public/:slug", attachUserIfPresent, publicCtrl.getPublicStore);
router.post(
  "/public/:slug/orders",
  orderLimiter,
  attachUserIfPresent,
  express.json({ limit: "256kb" }),
  publicCtrl.createOrderRequest
);

module.exports = router;
