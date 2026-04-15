const express = require("express");
const rateLimit = require("express-rate-limit");
const ordersCtrl = require("../controllers/orders.controller");
const { attachUserIfPresent } = require("../middleware/auth.middleware");

const router = express.Router();

const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  "/",
  orderLimiter,
  attachUserIfPresent,
  express.json({ limit: "256kb" }),
  ordersCtrl.createCartOrder
);

module.exports = router;
