const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if not exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// File filter - Allow image files and documents
const fileFilter = (req, file, cb) => {
    // Allowed MIME types
    const allowedMimes = [
        // Images
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp',
        'image/tiff',
        'image/svg+xml',
        // Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv',
        // Sometimes MIME type can be octet-stream
        'application/octet-stream'
    ];

    // Check file extension as fallback
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', 
                               '.pdf', '.doc', '.docx', '.xls', '.xlsx', 
                               '.ppt', '.pptx', '.txt', '.csv'];
    
    const fileExt = path.extname(file.originalname).toLowerCase();

    // Log for debugging
    console.log('File MIME type:', file.mimetype);
    console.log('File extension:', fileExt);
    console.log('Original filename:', file.originalname);

    // Check either by MIME type or extension
    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExt)) {
        cb(null, true);
    } else {
        cb(new Error(`অনুমোদিত ফাইল ফরম্যাট নয়। শুধুমাত্র ছবি (JPG, PNG, WebP ইত্যাদি) এবং ডকুমেন্ট (PDF, DOC ইত্যাদি) অনুমোদিত।`), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB file size limit
    }
});

module.exports = upload;