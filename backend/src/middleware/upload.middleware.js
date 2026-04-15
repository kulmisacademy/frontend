const multer = require("multer");

const memory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Logo must be an image"));
      return;
    }
    cb(null, true);
  },
});

const uploadLogo = memory.single("logo");

module.exports = { uploadLogo };
