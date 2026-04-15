const { z } = require("zod");
const storeModel = require("../models/store.model");
const productModel = require("../models/product.model");
const orderModel = require("../models/order.model");
const userModel = require("../models/user.model");

const createOrderBodySchema = z.object({
  store_id: z.string().uuid(),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().positive().max(999),
        price: z.number().optional(),
        name: z.string().max(500).optional(),
      })
    )
    .min(1)
    .max(100),
  total: z.number(),
});

/**
 * POST /api/orders — cart checkout (WhatsApp flow). Saves order first; client opens WhatsApp.
 */
async function createCartOrder(req, res) {
  try {
    const parsed = createOrderBodySchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid order payload",
        details: parsed.error.flatten(),
      });
    }
    const { store_id, items, total } = parsed.data;
    const store = await storeModel.findById(store_id);
    if (!store || store.status === "rejected") {
      return res.status(404).json({ error: "Store not found" });
    }
    const ids = [...new Set(items.map((i) => i.product_id))];
    const productRows = await productModel.findByIds(ids);
    const pmap = Object.fromEntries(productRows.map((p) => [p.id, p]));
    let computed = 0;
    const productsPayload = [];
    for (const line of items) {
      const p = pmap[line.product_id];
      if (!p || p.store_id !== store_id) {
        return res.status(400).json({ error: "Invalid product for this store" });
      }
      const qty = line.quantity;
      const unit = Number(p.price);
      computed += unit * qty;
      productsPayload.push({
        product_id: line.product_id,
        name: line.name?.trim() || p.name,
        quantity: qty,
        price: unit,
      });
    }
    if (Math.abs(computed - total) > 0.02 + items.length * 0.01) {
      return res.status(400).json({ error: "Total does not match items" });
    }
    let customer_id = null;
    let customer_name = null;
    let customer_phone = null;
    if (req.user && req.user.role === "customer") {
      customer_id = req.user.id;
      const u = await userModel.findById(req.user.id);
      if (u) {
        customer_name = u.name || null;
        customer_phone = u.phone || null;
      }
    }
    const items_summary = items
      .map((line) => {
        const p = pmap[line.product_id];
        const label = line.name?.trim() || p?.name || "Item";
        return `${label} × ${line.quantity}`;
      })
      .join("; ");
    const order = await orderModel.createOrderWithCode({
      store_id,
      status: "pending",
      customer_name,
      customer_phone,
      message: null,
      items_summary,
      total,
      product_id: null,
      customer_id,
      products: productsPayload,
    });
    res.status(201).json({ order_id: order.order_code, id: order.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not create order" });
  }
}

module.exports = {
  createCartOrder,
};
