const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const userModel = require("../models/user.model");
const { loadEnv } = require("../config/env");

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

function signAdminToken(user) {
  const { jwtSecret, adminJwtExpiresIn } = loadEnv();
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not set");
  }
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    },
    jwtSecret,
    { expiresIn: adminJwtExpiresIn || "2h" }
  );
}

/**
 * POST /api/admin/login — admin only; stricter JWT TTL than vendor/customer.
 * Does not set cookies (caller / BFF sets httpOnly cookie on the web origin).
 */
async function login(req, res) {
  try {
    const parsed = loginSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;
    const userRow = await userModel.findByEmail(email);
    if (!userRow || userRow.role !== "admin") {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const ok = await bcrypt.compare(password, userRow.password);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const user = await userModel.findById(userRow.id);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }
    const token = signAdminToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (e) {
    console.error("[admin-login]", e);
    res.status(500).json({ error: "Login failed" });
  }
}

module.exports = { login };
