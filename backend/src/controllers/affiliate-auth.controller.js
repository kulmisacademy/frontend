const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { loadEnv } = require("../config/env");
const affiliateModel = require("../models/affiliate.model");

const registerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().min(5).max(40),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function signAffiliateToken(affiliate) {
  const { jwtSecret, jwtExpiresIn } = loadEnv();
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not set on the API.");
  }
  return jwt.sign(
    {
      sub: affiliate.id,
      role: "affiliate",
      email: affiliate.email,
    },
    jwtSecret,
    { expiresIn: jwtExpiresIn }
  );
}

async function register(req, res) {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { name, email, phone, password } = parsed.data;
    const existing = await affiliateModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const affiliate = await affiliateModel.createAffiliate({
      name,
      email,
      phone,
      passwordHash,
    });
    const token = signAffiliateToken(affiliate);
    res.status(201).json({
      message: "Affiliate account created",
      token,
      affiliate: {
        id: affiliate.id,
        name: affiliate.name,
        email: affiliate.email,
        phone: affiliate.phone,
        ref_code: affiliate.ref_code,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Registration failed" });
  }
}

async function login(req, res) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;
    const row = await affiliateModel.findByEmail(email);
    if (!row) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const ok = await bcrypt.compare(password, row.password);
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const affiliate = await affiliateModel.findById(row.id);
    const token = signAffiliateToken(affiliate);
    res.json({
      token,
      affiliate: {
        id: affiliate.id,
        name: affiliate.name,
        email: affiliate.email,
        phone: affiliate.phone,
        ref_code: affiliate.ref_code,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Login failed" });
  }
}

async function resolveRef(req, res) {
  try {
    const code = String(req.params.code || "").trim();
    const a = await affiliateModel.findByRefCode(code);
    if (!a) {
      return res.status(404).json({ valid: false, error: "Unknown referral code" });
    }
    res.json({ valid: true, ref_code: a.ref_code });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
}

async function me(req, res) {
  try {
    const affiliate = await affiliateModel.findById(req.user.id);
    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate not found" });
    }
    res.json({ affiliate });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
}

module.exports = {
  register,
  login,
  resolveRef,
  me,
};
