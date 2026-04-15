const express = require("express");
const multer = require("multer");
const ai = require("../controllers/ai.controller");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
});

const router = express.Router();

router.post("/generate-product", upload.single("image"), ai.generateProduct);

module.exports = router;
