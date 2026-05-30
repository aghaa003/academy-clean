import { Router, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Uploads Directory
 */
const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Multer Storage Config
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },

  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);

    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_");

    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

/**
 * Allowed File Types
 */
const allowedMimeTypes = [
  // Images
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/avif",

  // Videos
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",

  // Documents
  "application/pdf",
  "text/plain",

  // Code Files
  "text/html",
  "text/css",
  "text/javascript",
  "application/json",

  // Archives
  "application/zip",
  "application/x-zip-compressed",

  // Generic
  "application/octet-stream",
];

/**
 * Multer Upload Config
 */
const upload = multer({
  storage,

  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  },

  fileFilter: (_req, file, cb) => {
    if (
      allowedMimeTypes.includes(file.mimetype) ||
      file.mimetype.startsWith("video/")
    ) {
      cb(null, true);
    } else {
      cb(new Error(`نوع الملف غير مدعوم: ${file.mimetype}`));
    }
  },
});

const router = Router();

/**
 * Upload Single File
 * POST /upload
 */
router.post("/", upload.single("file"), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: "لم يتم رفع أي ملف",
      });

      return;
    }

    const fileUrl = `/api/uploads/${req.file.filename}`;

    res.status(200).json({
      success: true,

      file: {
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "حدث خطأ أثناء رفع الملف",
    });
  }
});

/**
 * Upload Multiple Files
 * POST /upload/multiple
 */
router.post(
  "/multiple",
  upload.array("files", 20),
  (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          error: "لم يتم رفع أي ملف",
        });

        return;
      }

      const uploadedFiles = files.map((file) => ({
        url: `/api/uploads/${file.filename}`,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      }));

      res.status(200).json({
        success: true,
        count: uploadedFiles.length,
        files: uploadedFiles,
        urls: uploadedFiles.map((f) => f.url),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "حدث خطأ أثناء رفع الملفات",
      });
    }
  }
);

export default router;