const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (headmastersCollection) => {

    // Configure multer for headmaster photos
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            const uploadDir = path.join(__dirname, '../uploads/headmaster-photos');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, 'headmaster-' + uniqueSuffix + path.extname(file.originalname));
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

    // GET all headmasters
    router.get('/', async (req, res) => {
        try {
            const headmasters = await headmastersCollection.find({}).toArray();
            res.json({
                success: true,
                data: headmasters,
                count: headmasters.length
            });
        } catch (error) {
            console.error('Error fetching headmasters:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch headmasters list'
            });
        }
    });

    // GET single headmaster by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const headmaster = await headmastersCollection.findOne({ _id: new ObjectId(id) });

            if (!headmaster) {
                return res.status(404).json({
                    success: false,
                    message: 'Headmaster not found'
                });
            }

            res.json({
                success: true,
                data: headmaster
            });
        } catch (error) {
            console.error('Error fetching headmaster:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch headmaster'
            });
        }
    });

    // CREATE new headmaster with file upload
    router.post('/', upload.single('photo'), async (req, res) => {
        try {
            const { 
                name, 
                mobile, 
                email, 
                address, 
                joiningDate, 
                qualifications, 
                experience, 
                bloodGroup, 
                gender, 
                dateOfBirth,
                nidNumber,
                salary,
                achievements,
                message,
                isCurrent
            } = req.body;

            // Validation
            if (!name || !mobile) {
                return res.status(400).json({
                    success: false,
                    message: 'Name and mobile are required fields'
                });
            }

            // Check if mobile already exists
            const existingHeadmaster = await headmastersCollection.findOne({ mobile });
            if (existingHeadmaster) {
                return res.status(400).json({
                    success: false,
                    message: 'A headmaster with this mobile number already exists'
                });
            }

            // Mobile number validation
            const mobileRegex = /^[0-9]{11}$/;
            if (!mobileRegex.test(mobile)) {
                return res.status(400).json({
                    success: false,
                    message: 'Please enter a valid 11-digit mobile number'
                });
            }

            const newHeadmaster = {
                name: name.trim(),
                mobile: mobile.trim(),
                email: email?.trim() || '',
                address: address?.trim() || '',
                joiningDate: joiningDate || new Date(),
                qualifications: qualifications?.trim() || '',
                experience: experience || '',
                bloodGroup: bloodGroup || '',
                gender: gender || '',
                dateOfBirth: dateOfBirth || '',
                nidNumber: nidNumber || '',
                salary: salary || '',
                achievements: achievements?.trim() || '',
                message: message?.trim() || '',
                photo: req.file ? `/api/uploads/headmaster-photos/${req.file.filename}` : '',
                photoOriginalName: req.file ? req.file.originalname : '',
                isCurrent: isCurrent !== undefined ? JSON.parse(isCurrent) : false,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await headmastersCollection.insertOne(newHeadmaster);

            if (result.insertedId) {
                const createdHeadmaster = await headmastersCollection.findOne({ _id: result.insertedId });
                res.status(201).json({
                    success: true,
                    message: 'Headmaster added successfully',
                    data: createdHeadmaster
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to add headmaster'
                });
            }
        } catch (error) {
            console.error('Error adding headmaster:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add headmaster'
            });
        }
    });

    // UPDATE headmaster with file upload
    router.put('/:id', upload.single('photo'), async (req, res) => {
        try {
            const { id } = req.params;
            const { 
                name, 
                mobile, 
                email, 
                address, 
                joiningDate, 
                qualifications, 
                experience, 
                bloodGroup, 
                gender, 
                dateOfBirth,
                nidNumber,
                salary,
                achievements,
                message,
                isCurrent,
                isActive
            } = req.body;

            // Validation
            if (!name || !mobile) {
                return res.status(400).json({
                    success: false,
                    message: 'Name and mobile are required fields'
                });
            }

            // Check if mobile already exists for other headmasters
            const existingHeadmaster = await headmastersCollection.findOne({ 
                mobile, 
                _id: { $ne: new ObjectId(id) } 
            });
            
            if (existingHeadmaster) {
                return res.status(400).json({
                    success: false,
                    message: 'A headmaster with this mobile number already exists'
                });
            }

            // Get current headmaster data
            const currentHeadmaster = await headmastersCollection.findOne({ _id: new ObjectId(id) });
            if (!currentHeadmaster) {
                return res.status(404).json({
                    success: false,
                    message: 'Headmaster not found'
                });
            }

            const updateData = {
                name: name.trim(),
                mobile: mobile.trim(),
                email: email?.trim() || '',
                address: address?.trim() || '',
                joiningDate: joiningDate || new Date(),
                qualifications: qualifications?.trim() || '',
                experience: experience || '',
                bloodGroup: bloodGroup || '',
                gender: gender || '',
                dateOfBirth: dateOfBirth || '',
                nidNumber: nidNumber || '',
                salary: salary || '',
                achievements: achievements?.trim() || '',
                message: message?.trim() || '',
                isCurrent: isCurrent !== undefined ? JSON.parse(isCurrent) : false,
                isActive: isActive !== undefined ? JSON.parse(isActive) : true,
                updatedAt: new Date()
            };

            // If new photo uploaded, update photo path and delete old photo
            if (req.file) {
                // Delete old photo file if exists
                if (currentHeadmaster.photo && currentHeadmaster.photo.startsWith('/api/uploads/headmaster-photos/')) {
                    const oldFilename = currentHeadmaster.photo.replace('/api/uploads/headmaster-photos/', '');
                    const oldImagePath = path.join(__dirname, '..', 'uploads', 'headmaster-photos', oldFilename);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                    }
                }

                updateData.photo = `/api/uploads/headmaster-photos/${req.file.filename}`;
                updateData.photoOriginalName = req.file.originalname;
            }

            const result = await headmastersCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.modifiedCount > 0) {
                const updatedHeadmaster = await headmastersCollection.findOne({ _id: new ObjectId(id) });
                res.json({
                    success: true,
                    message: 'Headmaster updated successfully',
                    data: updatedHeadmaster
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Headmaster not found or no changes made'
                });
            }
        } catch (error) {
            console.error('Error updating headmaster:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update headmaster'
            });
        }
    });

    // DELETE headmaster
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            // Get headmaster data first to delete photo file
            const headmaster = await headmastersCollection.findOne({ _id: new ObjectId(id) });
            
            if (!headmaster) {
                return res.status(404).json({
                    success: false,
                    message: 'Headmaster not found'
                });
            }

            // Delete photo file if exists
            if (headmaster.photo && headmaster.photo.startsWith('/api/uploads/headmaster-photos/')) {
                const filename = headmaster.photo.replace('/api/uploads/headmaster-photos/', '');
                const imagePath = path.join(__dirname, '..', 'uploads', 'headmaster-photos', filename);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }

            const result = await headmastersCollection.deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount > 0) {
                res.json({
                    success: true,
                    message: 'Headmaster deleted successfully'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Headmaster not found'
                });
            }
        } catch (error) {
            console.error('Error deleting headmaster:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete headmaster'
            });
        }
    });

    // SET as current headmaster
    router.patch('/:id/set-current', async (req, res) => {
        try {
            const { id } = req.params;

            // First, set all headmasters as not current
            await headmastersCollection.updateMany(
                {},
                { $set: { isCurrent: false, updatedAt: new Date() } }
            );

            // Then set the selected headmaster as current
            const result = await headmastersCollection.updateOne(
                { _id: new ObjectId(id) },
                { 
                    $set: { 
                        isCurrent: true,
                        updatedAt: new Date()
                    } 
                }
            );

            if (result.modifiedCount > 0) {
                const updatedHeadmaster = await headmastersCollection.findOne({ _id: new ObjectId(id) });
                res.json({
                    success: true,
                    message: 'Headmaster set as current successfully',
                    data: updatedHeadmaster
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Headmaster not found'
                });
            }
        } catch (error) {
            console.error('Error setting current headmaster:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to set current headmaster'
            });
        }
    });

    // TOGGLE headmaster status
    router.patch('/:id/toggle', async (req, res) => {
        try {
            const headmaster = await headmastersCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!headmaster) {
                return res.status(404).json({
                    success: false,
                    message: 'Headmaster not found'
                });
            }

            const result = await headmastersCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { 
                    $set: { 
                        isActive: !headmaster.isActive,
                        updatedAt: new Date()
                    } 
                }
            );

            res.json({
                success: true,
                message: `Headmaster ${!headmaster.isActive ? 'activated' : 'deactivated'} successfully`,
                data: {
                    isActive: !headmaster.isActive
                }
            });
        } catch (error) {
            console.error('Error toggling headmaster status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to toggle headmaster status'
            });
        }
    });

    // GET current headmaster
    router.get('/current/active', async (req, res) => {
        try {
            const currentHeadmaster = await headmastersCollection.findOne({ 
                isCurrent: true,
                isActive: true 
            });

            res.json({
                success: true,
                data: currentHeadmaster
            });
        } catch (error) {
            console.error('Error fetching current headmaster:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch current headmaster'
            });
        }
    });

    return router;
};