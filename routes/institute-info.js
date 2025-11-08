const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (instituteInfoCollection) => {

    // Configure multer for file uploads
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            const uploadDir = path.join(__dirname, '../uploads/institute-info');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const fileType = req.body.type || 'file';
            cb(null, fileType + '-' + uniqueSuffix + path.extname(file.originalname));
        }
    });

    const fileFilter = (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    };

    const upload = multer({
        storage: storage,
        fileFilter: fileFilter,
        limits: {
            fileSize: 2 * 1024 * 1024 // 2MB
        }
    });

    // GET institute info (only one record should exist)
    router.get('/', async (req, res) => {
        try {
            const instituteInfo = await instituteInfoCollection.findOne({});
            
            res.json({
                success: true,
                data: instituteInfo,
                exists: !!instituteInfo
            });
        } catch (error) {
            console.error('Error fetching institute info:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch institute information'
            });
        }
    });

    // CREATE institute info
    router.post('/', async (req, res) => {
        try {
            const { 
                name,
                founder,
                established,
                eiin,
                slogan,
                shortDescription,
                mobile,
                introduction,
                address,
                thanaDistrict,
                postOffice,
                country,
                language,
                email,
                logo,
                favicon,
                principalSignature,
                educationSecretarySignature
            } = req.body;

            // Validation
            if (!name || !founder || !established || !mobile) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, founder, established year, and mobile are required fields'
                });
            }

            // Check if institute info already exists
            const existingInfo = await instituteInfoCollection.findOne({});
            if (existingInfo) {
                return res.status(400).json({
                    success: false,
                    message: 'Institute information already exists. Use update instead.'
                });
            }

            const newInstituteInfo = {
                name: name.trim(),
                founder: founder.trim(),
                established: parseInt(established),
                eiin: eiin?.trim() || '',
                slogan: slogan?.trim() || '',
                shortDescription: shortDescription?.trim() || '',
                mobile: mobile.trim(),
                introduction: introduction || '',
                address: address?.trim() || '',
                thanaDistrict: thanaDistrict?.trim() || '',
                postOffice: postOffice?.trim() || '',
                country: country || 'Bangladesh',
                language: language || 'bengali',
                email: email?.trim() || '',
                logo: logo || '',
                favicon: favicon || '',
                principalSignature: principalSignature || '',
                educationSecretarySignature: educationSecretarySignature || '',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await instituteInfoCollection.insertOne(newInstituteInfo);

            if (result.insertedId) {
                const createdInfo = await instituteInfoCollection.findOne({ _id: result.insertedId });
                res.status(201).json({
                    success: true,
                    message: 'Institute information created successfully',
                    data: createdInfo
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to create institute information'
                });
            }
        } catch (error) {
            console.error('Error creating institute info:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create institute information'
            });
        }
    });

    // UPDATE institute info
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { 
                name,
                founder,
                established,
                eiin,
                slogan,
                shortDescription,
                mobile,
                introduction,
                address,
                thanaDistrict,
                postOffice,
                country,
                language,
                email,
                logo,
                favicon,
                principalSignature,
                educationSecretarySignature
            } = req.body;

            // Validation
            if (!name || !founder || !established || !mobile) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, founder, established year, and mobile are required fields'
                });
            }

            const updateData = {
                name: name.trim(),
                founder: founder.trim(),
                established: parseInt(established),
                eiin: eiin?.trim() || '',
                slogan: slogan?.trim() || '',
                shortDescription: shortDescription?.trim() || '',
                mobile: mobile.trim(),
                introduction: introduction || '',
                address: address?.trim() || '',
                thanaDistrict: thanaDistrict?.trim() || '',
                postOffice: postOffice?.trim() || '',
                country: country || 'Bangladesh',
                language: language || 'bengali',
                email: email?.trim() || '',
                updatedAt: new Date()
            };

            // Only update file fields if they are provided
            if (logo) updateData.logo = logo;
            if (favicon) updateData.favicon = favicon;
            if (principalSignature) updateData.principalSignature = principalSignature;
            if (educationSecretarySignature) updateData.educationSecretarySignature = educationSecretarySignature;

            const result = await instituteInfoCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.modifiedCount > 0) {
                const updatedInfo = await instituteInfoCollection.findOne({ _id: new ObjectId(id) });
                res.json({
                    success: true,
                    message: 'Institute information updated successfully',
                    data: updatedInfo
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Institute information not found or no changes made'
                });
            }
        } catch (error) {
            console.error('Error updating institute info:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update institute information'
            });
        }
    });

    // FILE UPLOAD endpoint
    router.post('/upload', upload.single('file'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            const fileUrl = `/api/uploads/institute-info/${req.file.filename}`;

            res.json({
                success: true,
                message: 'File uploaded successfully',
                fileUrl: fileUrl,
                fileName: req.file.filename
            });
        } catch (error) {
            console.error('Error uploading file:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to upload file'
            });
        }
    });

    // DELETE file
    router.delete('/file/:filename', async (req, res) => {
        try {
            const { filename } = req.params;
            const filePath = path.join(__dirname, '..', 'uploads', 'institute-info', filename);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                res.json({
                    success: true,
                    message: 'File deleted successfully'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'File not found'
                });
            }
        } catch (error) {
            console.error('Error deleting file:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete file'
            });
        }
    });

    return router;
};