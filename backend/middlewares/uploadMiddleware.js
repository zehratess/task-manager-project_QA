const multer = require('multer');

//configure storage
const storage = multer.diskStorage({
    destination: (res, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (res, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

//file filter
const fileFilter = (res, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG and JPG are allowed.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 1024 * 1024 * 5 }, //5MB limit (bu orijinalde yok btw)
});

module.exports = upload;