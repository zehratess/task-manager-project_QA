const express = require("express");
const multer = require("multer");
const path = require("path");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

//  Dosya storage ayarı
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/files/'); // ✅ uploads/files/ klasörüne kaydet
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

//  Dosya filter (tüm dosya tipleri)
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/jpg'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX, TXT, JPG, PNG allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

//  File upload endpoint
router.post("/upload-file", protect, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  
  const fileUrl = `${req.protocol}://${req.get("host")}/uploads/files/${req.file.filename}`;
  
  res.status(200).json({ 
    fileUrl,
    fileName: req.file.originalname,
    fileSize: req.file.size
  });
});

module.exports = router;