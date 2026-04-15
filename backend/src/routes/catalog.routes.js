const express = require("express");
const catalog = require("../controllers/catalog.controller");

const router = express.Router();

router.get("/stores", catalog.listStores);
router.get("/products", catalog.listProducts);
router.get("/products/:id", catalog.getProduct);
router.post("/products/batch", express.json(), catalog.batchProducts);

module.exports = router;
