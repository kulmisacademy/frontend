function slugify(name) {
  const s = String(name || "")
    .toLowerCase()
    .trim()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s.slice(0, 60) || "store";
}

module.exports = { slugify };
