const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

module.exports = (documentCollection) => {
    
    // ✅ GET all documents with populated data
    router.get('/', async (req, res) => {
        try {
            const documents = await documentCollection.find().sort({ createdAt: -1 }).toArray();
            res.json({
                success: true,
                data: documents
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ডকুমেন্ট লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ✅ GET single document by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ ডকুমেন্ট আইডি'
                });
            }

            const document = await documentCollection.findOne({ _id: new ObjectId(id) });

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: 'ডকুমেন্ট পাওয়া যায়নি'
                });
            }

            res.json({
                success: true,
                data: document
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ডকুমেন্ট ডেটা আনতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

// ✅ CREATE new document - description remove korlam
router.post('/', upload.single('file'), async (req, res) => {
    try {
        const { title, category, teacher } = req.body; // description remove

        if (!title || !category) {
            return res.status(400).json({
                success: false,
                message: 'শিরোনাম এবং ক্যাটাগরী আবশ্যক'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'ফাইল আপলোড আবশ্যক'
            });
        }

        // Check if document title already exists
        const existingDocument = await documentCollection.findOne({ 
            title: { $regex: new RegExp(`^${title}$`, 'i') } 
        });

        if (existingDocument) {
            // Delete the uploaded file since validation failed
            const filePath = path.join(__dirname, '..', 'uploads', req.file.filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            
            return res.status(400).json({
                success: false,
                message: 'এই শিরোনামের ডকুমেন্ট ইতিমধ্যে存在'
            });
        }

        const newDocument = {
            title: title.trim(),
            category: category || '',
            teacher: teacher || '',
            // description field remove korlam
            fileName: req.file.originalname,
            filePath: `/api/uploads/${req.file.filename}`,
            fileSize: req.file.size,
            fileType: req.file.mimetype,
            isActive: true,
            downloads: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await documentCollection.insertOne(newDocument);

        res.status(201).json({
            success: true,
            message: 'ডকুমেন্ট সফলভাবে তৈরি হয়েছে',
            data: {
                _id: result.insertedId,
                ...newDocument
            }
        });
    } catch (error) {
        // Delete uploaded file if error occurs
        if (req.file) {
            const filePath = path.join(__dirname, '..', 'uploads', req.file.filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        
        res.status(500).json({
            success: false,
            message: 'ডকুমেন্ট তৈরি করতে সমস্যা হয়েছে',
            error: error.message
        });
    }
});

    // ✅ UPDATE document
    router.put('/:id', upload.single('file'), async (req, res) => {
        try {
            const { id } = req.params;
            const { title, category, teacher, description } = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ ডকুমেন্ট আইডি'
                });
            }

            const existingDocument = await documentCollection.findOne({ _id: new ObjectId(id) });
            if (!existingDocument) {
                return res.status(404).json({
                    success: false,
                    message: 'ডকুমেন্ট পাওয়া যায়নি'
                });
            }

            // Check if document title already exists (excluding current document)
            if (title && title !== existingDocument.title) {
                const duplicateDocument = await documentCollection.findOne({ 
                    title: { $regex: new RegExp(`^${title}$`, 'i') },
                    _id: { $ne: new ObjectId(id) }
                });

                if (duplicateDocument) {
                    return res.status(400).json({
                        success: false,
                        message: 'এই শিরোনামের ডকুমেন্ট ইতিমধ্যে存在'
                    });
                }
            }

            let updatedFileData = {
                fileName: existingDocument.fileName,
                filePath: existingDocument.filePath,
                fileSize: existingDocument.fileSize,
                fileType: existingDocument.fileType
            };

            // If new file is uploaded
            if (req.file) {
                // Delete old file if exists
                if (existingDocument.filePath && existingDocument.filePath.startsWith('/api/uploads/')) {
                    const oldFile = existingDocument.filePath.replace('/api/uploads/', '');
                    const oldPath = path.join(__dirname, '..', 'uploads', oldFile);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }

                updatedFileData = {
                    fileName: req.file.originalname,
                    filePath: `/api/uploads/${req.file.filename}`,
                    fileSize: req.file.size,
                    fileType: req.file.mimetype
                };
            }

            const updatedData = {
                title: title || existingDocument.title,
                category: category || existingDocument.category,
                teacher: teacher || existingDocument.teacher,
                description: description || existingDocument.description,
                ...updatedFileData,
                updatedAt: new Date()
            };

            await documentCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedData }
            );

            res.json({
                success: true,
                message: 'ডকুমেন্ট সফলভাবে আপডেট হয়েছে',
                data: updatedData
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ডকুমেন্ট আপডেট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ✅ DELETE document
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ ডকুমেন্ট আইডি'
                });
            }

            const document = await documentCollection.findOne({ _id: new ObjectId(id) });

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: 'ডকুমেন্ট পাওয়া যায়নি'
                });
            }

            // Delete file from uploads directory
            if (document.filePath && document.filePath.startsWith('/api/uploads/')) {
                const fileToDelete = document.filePath.replace('/api/uploads/', '');
                const filePath = path.join(__dirname, '..', 'uploads', fileToDelete);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }

            await documentCollection.deleteOne({ _id: new ObjectId(id) });

            res.json({
                success: true,
                message: 'ডকুমেন্ট সফলভাবে ডিলিট হয়েছে'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ডকুমেন্ট ডিলিট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ✅ TOGGLE document active status
    router.patch('/:id/toggle', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ ডকুমেন্ট আইডি'
                });
            }

            const document = await documentCollection.findOne({ _id: new ObjectId(id) });

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: 'ডকুমেন্ট পাওয়া যায়নি'
                });
            }

            const updatedStatus = !document.isActive;
            await documentCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { isActive: updatedStatus, updatedAt: new Date() } }
            );

            res.json({
                success: true,
                message: `ডকুমেন্ট ${updatedStatus ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে`,
                data: { isActive: updatedStatus }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ✅ INCREMENT download count
    router.patch('/:id/download', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ ডকুমেন্ট আইডি'
                });
            }

            const document = await documentCollection.findOne({ _id: new ObjectId(id) });

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: 'ডকুমেন্ট পাওয়া যায়নি'
                });
            }

            const newDownloadCount = (document.downloads || 0) + 1;
            await documentCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { downloads: newDownloadCount, updatedAt: new Date() } }
            );

            res.json({
                success: true,
                message: 'ডাউনলোড কাউন্ট আপডেট হয়েছে',
                data: { downloads: newDownloadCount }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ডাউনলোড কাউন্ট আপডেট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    return router;
};