/**
 * Optional env ADMIN_IP_ALLOWLIST=comma-separated IPs or CIDR suffixes.
 * When unset, all IPs are allowed (development default).
 */
function adminIpAllowlist(req, res, next) {
  const raw = process.env.ADMIN_IP_ALLOWLIST?.trim();
  if (!raw) return next();
  const allowed = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const rawIp = req.ip || req.socket?.remoteAddress || "";
  const ip = String(rawIp).replace(/^::ffff:/, "");
  const ok = allowed.some((a) => ip === a || ip.endsWith(a));
  if (!ok) {
    return res.status(403).json({
      error: "Admin login is not allowed from this network",
    });
  }
  return next();
}

module.exports = { adminIpAllowlist };
