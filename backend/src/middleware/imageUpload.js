const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const { randomUUID } = require("crypto");

// إعداد تخزين multer مؤقت
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB حد أقصى
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(
      new Error("نوع الملف غير مدعوم. يرجى رفع صورة بصيغة jpg, png, gif, webp"),
    );
  },
});

// middleware لمعالجة الصورة (crop + resize)
const processImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new Error("الرجاء رفع صورة"));
    }

    const imageId = randomUUID();
    const filename = `${imageId}.webp`; // تحويل إلى webp للضغط
    const uploadPath = path.join(__dirname, "../../uploads", filename);

    // التأكد من وجود المجلد (للاحتياط)
    const uploadsDir = path.dirname(uploadPath);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    console.log(`Processing image: ${req.file.originalname} -> ${uploadPath}`);

    // معالجة الصورة: resize + تحويل إلى webp
    await sharp(req.file.buffer)
      .resize(800, 800, {
        // حجم أقصى 800x800
        fit: "cover", // تغطية المساحة
        position: "center", // اقتصاص من المركز
      })
      .webp({ quality: 80 }) // ضغط بجودة 80%
      .toFile(uploadPath);

    // تخزين المسار النسبي في req
    req.imagePath = `/uploads/${filename}`;
    console.log(`Image processed successfully: ${req.imagePath}`);
    next();
  } catch (err) {
    console.error("خطأ في معالجة الصورة باستخدام Sharp:", err);
    next(new Error(`فشل معالجة الصورة: ${err.message}`));
  }
};

module.exports = { upload, processImage };
