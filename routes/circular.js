// routes/circular.js
const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create circular uploads directory if not exists
const circularUploadsDir = path.join(__dirname, '../uploads/circulars');
if (!fs.existsSync(circularUploadsDir)) {
    fs.mkdirSync(circularUploadsDir, { recursive: true });
}

// Storage configuration for circular files
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, circularUploadsDir);
    },
    filename: function (req, file, cb) {
        // Unique filename with timestamp and original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const originalName = file.originalname.replace(/\s+/g, '_');
        cb(null, 'circular-' + uniqueSuffix + '-' + originalName);
    }
});

// File filter for allowed file types
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('শুধুমাত্র PDF, Image, Word, Excel এবং Text ফাইল আপলোড করা যাবে'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB file size limit
    }
});

module.exports = (circularCollection) => {
    
    // Get all circulars with pagination
    router.get('/', async (req, res) => {
        try {
            const { page = 1, limit = 10, search = '' } = req.query;
            const skip = (page - 1) * limit;

            let query = {};
            if (search) {
                query = {
                    $or: [
                        { title: { $regex: search, $options: 'i' } },
                        { description: { $regex: search, $options: 'i' } },
                        { category: { $regex: search, $options: 'i' } }
                    ]
                };
            }

            const circulars = await circularCollection.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .toArray();

            const total = await circularCollection.countDocuments(query);

            res.json({
                success: true,
                data: circulars,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    itemsPerPage: parseInt(limit)
                }
            });
        } catch (error) {
            console.error('Error fetching circulars:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch circulars'
            });
        }
    });

    // Get circular by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const circular = await circularCollection.findOne({ _id: new ObjectId(id) });

            if (!circular) {
                return res.status(404).json({
                    success: false,
                    message: 'Circular not found'
                });
            }

            res.json({
                success: true,
                data: circular
            });
        } catch (error) {
            console.error('Error fetching circular:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch circular'
            });
        }
    });

    // Add new circular with file upload
    router.post('/', upload.single('file'), async (req, res) => {
        try {
            const { title, description, category, targetAudience, isActive = true } = req.body;

            // Validate required fields
            if (!title || !req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Title and file are required'
                });
            }

            const circularData = {
                title,
                description: description || '',
                category: category || 'general',
                targetAudience: targetAudience || 'all',
                fileName: req.file.originalname,
                filePath: `/uploads/circulars/${req.file.filename}`,
                fileSize: req.file.size,
                fileType: req.file.mimetype,
                fileExtension: path.extname(req.file.originalname).toLowerCase(),
                isActive: isActive === 'true',
                downloads: 0,
                views: 0,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await circularCollection.insertOne(circularData);
            
            res.json({
                success: true,
                message: 'Circular uploaded successfully',
                data: { 
                    insertedId: result.insertedId,
                    fileName: circularData.fileName,
                    filePath: circularData.filePath
                }
            });
        } catch (error) {
            console.error('Error uploading circular:', error);
            
            // Delete uploaded file if there was an error
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }

            res.status(500).json({
                success: false,
                message: error.message || 'Failed to upload circular'
            });
        }
    });

    // Update circular (without file)
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { title, description, category, targetAudience, isActive } = req.body;

            const updateData = {
                ...(title && { title }),
                ...(description && { description }),
                ...(category && { category }),
                ...(targetAudience && { targetAudience }),
                ...(isActive !== undefined && { isActive: isActive === 'true' }),
                updatedAt: new Date()
            };

            const result = await circularCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Circular not found'
                });
            }

            res.json({
                success: true,
                message: 'Circular updated successfully'
            });
        } catch (error) {
            console.error('Error updating circular:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update circular'
            });
        }
    });

    // Update circular with file
    router.put('/:id/file', upload.single('file'), async (req, res) => {
        try {
            const { id } = req.params;

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'File is required'
                });
            }

            // Get existing circular to delete old file
            const existingCircular = await circularCollection.findOne({ _id: new ObjectId(id) });
            if (!existingCircular) {
                // Delete uploaded file if circular not found
                fs.unlinkSync(req.file.path);
                return res.status(404).json({
                    success: false,
                    message: 'Circular not found'
                });
            }

            // Delete old file
            if (existingCircular.filePath) {
                const oldFilePath = path.join(__dirname, '..', existingCircular.filePath);
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath);
                }
            }

            const updateData = {
                fileName: req.file.originalname,
                filePath: `/uploads/circulars/${req.file.filename}`,
                fileSize: req.file.size,
                fileType: req.file.mimetype,
                fileExtension: path.extname(req.file.originalname).toLowerCase(),
                updatedAt: new Date()
            };

            const result = await circularCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            res.json({
                success: true,
                message: 'Circular file updated successfully',
                data: {
                    fileName: updateData.fileName,
                    filePath: updateData.filePath
                }
            });
        } catch (error) {
            console.error('Error updating circular file:', error);
            
            // Delete uploaded file if there was an error
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }

            res.status(500).json({
                success: false,
                message: error.message || 'Failed to update circular file'
            });
        }
    });

    // Delete circular
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            // Get circular to delete file
            const circular = await circularCollection.findOne({ _id: new ObjectId(id) });
            if (!circular) {
                return res.status(404).json({
                    success: false,
                    message: 'Circular not found'
                });
            }

            // Delete file from filesystem
            if (circular.filePath) {
                const filePath = path.join(__dirname, '..', circular.filePath);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }

            const result = await circularCollection.deleteOne({ _id: new ObjectId(id) });

            res.json({
                success: true,
                message: 'Circular deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting circular:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete circular'
            });
        }
    });

    // Increment download count
    router.patch('/:id/download', async (req, res) => {
        try {
            const { id } = req.params;

            const result = await circularCollection.updateOne(
                { _id: new ObjectId(id) },
                { $inc: { downloads: 1 } }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Circular not found'
                });
            }

            res.json({
                success: true,
                message: 'Download count updated'
            });
        } catch (error) {
            console.error('Error updating download count:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update download count'
            });
        }
    });

    // Increment view count
    router.patch('/:id/view', async (req, res) => {
        try {
            const { id } = req.params;

            const result = await circularCollection.updateOne(
                { _id: new ObjectId(id) },
                { $inc: { views: 1 } }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Circular not found'
                });
            }

            res.json({
                success: true,
                message: 'View count updated'
            });
        } catch (error) {
            console.error('Error updating view count:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update view count'
            });
        }
    });

    // Get circular statistics
    router.get('/stats/summary', async (req, res) => {
        try {
            const totalCirculars = await circularCollection.countDocuments();
            const activeCirculars = await circularCollection.countDocuments({ isActive: true });
            const totalDownloads = await circularCollection.aggregate([
                { $group: { _id: null, total: { $sum: '$downloads' } } }
            ]).toArray();
            const totalViews = await circularCollection.aggregate([
                { $group: { _id: null, total: { $sum: '$views' } } }
            ]).toArray();

            // File type distribution
            const fileTypeStats = await circularCollection.aggregate([
                { $group: { 
                    _id: '$fileType', 
                    count: { $sum: 1 },
                    totalDownloads: { $sum: '$downloads' }
                }},
                { $sort: { count: -1 } }
            ]).toArray();

            res.json({
                success: true,
                data: {
                    totalCirculars,
                    activeCirculars,
                    totalDownloads: totalDownloads[0]?.total || 0,
                    totalViews: totalViews[0]?.total || 0,
                    fileTypeStats
                }
            });
        } catch (error) {
            console.error('Error fetching circular stats:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch circular statistics'
            });
        }
    });

    return router;
};