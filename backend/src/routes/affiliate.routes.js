const express = require("express");
const affiliate = require("../controllers/affiliate.controller");
const { asyncHandler } = require("../middleware/async-handler");

const router = express.Router();

router.get("/overview", asyncHandler(affiliate.overview));
router.get("/referrals", asyncHandler(affiliate.referrals));
router.get("/commissions", asyncHandler(affiliate.commissions));
router.get("/withdrawals", asyncHandler(affiliate.withdrawals));
router.post(
  "/withdrawals",
  express.json(),
  asyncHandler(affiliate.requestWithdrawal)
);

module.exports = router;
