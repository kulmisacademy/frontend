const jwt = require("jsonwebtoken");
const { loadEnv } = require("../config/env");

function extractBearer(req) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith("Bearer ")) return null;
  return h.slice(7);
}

function verifyToken(token) {
  const { jwtSecret } = loadEnv();
  if (!jwtSecret) throw new Error("JWT_SECRET is not set");
  return jwt.verify(token, jwtSecret);
}

function requireAuth(req, res, next) {
  try {
    const token = extractBearer(req);
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

async function attachUserIfPresent(req, res, next) {
  try {
    const token = extractBearer(req);
    if (!token) return next();
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    next();
  } catch {
    next();
  }
}

module.exports = {
  extractBearer,
  verifyToken,
  requireAuth,
  requireRole,
  attachUserIfPresent,
};
