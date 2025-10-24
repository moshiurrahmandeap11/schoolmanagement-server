const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/admission-forms');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'admission-form-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter for allowed types
const fileFilter = (req, file, cb) => {
    const allowedMimes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, Word, Excel, and Image files are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB file size limit
    }
});

module.exports = (admissionFormCollection) => {
    
    // GET admission form file info
    router.get('/', async (req, res) => {
        try {
            const admissionForm = await admissionFormCollection.findOne({});
            res.json({
                success: true,
                data: admissionForm || null
            });
        } catch (error) {
            console.error('Error fetching admission form:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch admission form'
            });
        }
    });

    // UPLOAD or UPDATE admission form file
    router.post('/upload', upload.single('admissionForm'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            const fileInfo = {
                filename: req.file.filename,
                originalName: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                path: req.file.path,
                uploadedAt: new Date()
            };

            // Check if admission form already exists
            const existingForm = await admissionFormCollection.findOne({});

            if (existingForm) {
                // Delete old file from server
                try {
                    if (fs.existsSync(existingForm.path)) {
                        fs.unlinkSync(existingForm.path);
                    }
                } catch (fileError) {
                    console.error('Error deleting old file:', fileError);
                }

                // Update existing form
                const result = await admissionFormCollection.updateOne(
                    { _id: existingForm._id },
                    { 
                        $set: fileInfo 
                    }
                );

                if (result.modifiedCount > 0) {
                    res.json({
                        success: true,
                        message: 'Admission form updated successfully',
                        data: { _id: existingForm._id, ...fileInfo }
                    });
                } else {
                    res.status(400).json({
                        success: false,
                        message: 'Failed to update admission form'
                    });
                }
            } else {
                // Create new admission form
                const newAdmissionForm = {
                    ...fileInfo,
                    createdAt: new Date()
                };

                const result = await admissionFormCollection.insertOne(newAdmissionForm);

                if (result.insertedId) {
                    res.status(201).json({
                        success: true,
                        message: 'Admission form uploaded successfully',
                        data: { _id: result.insertedId, ...newAdmissionForm }
                    });
                } else {
                    res.status(400).json({
                        success: false,
                        message: 'Failed to upload admission form'
                    });
                }
            }
        } catch (error) {
            console.error('Error uploading admission form:', error);
            
            // Delete uploaded file if there was an error
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to upload admission form'
            });
        }
    });

    // DELETE admission form
    router.delete('/', async (req, res) => {
        try {
            const existingForm = await admissionFormCollection.findOne({});

            if (!existingForm) {
                return res.status(404).json({
                    success: false,
                    message: 'No admission form found to delete'
                });
            }

            // Delete file from server
            try {
                if (fs.existsSync(existingForm.path)) {
                    fs.unlinkSync(existingForm.path);
                }
            } catch (fileError) {
                console.error('Error deleting file:', fileError);
            }

            // Delete from database
            const result = await admissionFormCollection.deleteOne({ _id: existingForm._id });

            if (result.deletedCount > 0) {
                res.json({
                    success: true,
                    message: 'Admission form deleted successfully'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to delete admission form'
                });
            }
        } catch (error) {
            console.error('Error deleting admission form:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete admission form'
            });
        }
    });

// Serve admission form file - Updated endpoint
router.get('/download/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const admissionForm = await admissionFormCollection.findOne({ filename });

        if (!admissionForm) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        const filePath = admissionForm.path;

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'File not found on server'
            });
        }

        // Set appropriate headers for download
        res.setHeader('Content-Type', admissionForm.mimetype);
        res.setHeader('Content-Disposition', `attachment; filename="${admissionForm.originalName}"`);
        
        // Stream the file to the response
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Error downloading file:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to download file'
        });
    }
});

    return router;
};