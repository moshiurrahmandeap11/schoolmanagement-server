const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (workersListCollection) => {

    // Configure multer for worker photos
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            const uploadDir = path.join(__dirname, '../uploads/worker-photos');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, 'worker-' + uniqueSuffix + path.extname(file.originalname));
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

    // GET all workers
    router.get('/', async (req, res) => {
        try {
            const workers = await workersListCollection.find({}).toArray();
            res.json({
                success: true,
                data: workers,
                count: workers.length
            });
        } catch (error) {
            console.error('Error fetching workers:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch workers list'
            });
        }
    });

    // GET single worker by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const worker = await workersListCollection.findOne({ _id: new ObjectId(id) });

            if (!worker) {
                return res.status(404).json({
                    success: false,
                    message: 'Worker not found'
                });
            }

            res.json({
                success: true,
                data: worker
            });
        } catch (error) {
            console.error('Error fetching worker:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch worker'
            });
        }
    });

    // CREATE new worker with file upload
    router.post('/', upload.single('photo'), async (req, res) => {
        try {
            const { 
                name, 
                mobile, 
                designation, 
                department, 
                email, 
                address, 
                joiningDate, 
                salary, 
                experience, 
                bloodGroup, 
                gender, 
                dateOfBirth,
                responsibilities,
                workShift,
                nidNumber
            } = req.body;

            // Validation
            if (!name || !mobile || !designation) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, mobile and designation are required fields'
                });
            }

            // Check if mobile already exists
            const existingWorker = await workersListCollection.findOne({ mobile });
            if (existingWorker) {
                return res.status(400).json({
                    success: false,
                    message: 'A worker with this mobile number already exists'
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

            const newWorker = {
                name: name.trim(),
                mobile: mobile.trim(),
                designation: designation.trim(),
                department: department?.trim() || '',
                email: email?.trim() || '',
                address: address?.trim() || '',
                joiningDate: joiningDate || new Date(),
                salary: salary || '',
                experience: experience || '',
                bloodGroup: bloodGroup || '',
                gender: gender || '',
                dateOfBirth: dateOfBirth || '',
                responsibilities: responsibilities?.trim() || '',
                workShift: workShift || '',
                nidNumber: nidNumber || '',
                photo: req.file ? `/api/uploads/worker-photos/${req.file.filename}` : '',
                photoOriginalName: req.file ? req.file.originalname : '',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await workersListCollection.insertOne(newWorker);

            if (result.insertedId) {
                const createdWorker = await workersListCollection.findOne({ _id: result.insertedId });
                res.status(201).json({
                    success: true,
                    message: 'Worker added successfully',
                    data: createdWorker
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to add worker'
                });
            }
        } catch (error) {
            console.error('Error adding worker:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add worker'
            });
        }
    });

    // UPDATE worker with file upload
    router.put('/:id', upload.single('photo'), async (req, res) => {
        try {
            const { id } = req.params;
            const { 
                name, 
                mobile, 
                designation, 
                department, 
                email, 
                address, 
                joiningDate, 
                salary, 
                experience, 
                bloodGroup, 
                gender, 
                dateOfBirth,
                responsibilities,
                workShift,
                nidNumber,
                isActive
            } = req.body;

            // Validation
            if (!name || !mobile || !designation) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, mobile and designation are required fields'
                });
            }

            // Check if mobile already exists for other workers
            const existingWorker = await workersListCollection.findOne({ 
                mobile, 
                _id: { $ne: new ObjectId(id) } 
            });
            
            if (existingWorker) {
                return res.status(400).json({
                    success: false,
                    message: 'A worker with this mobile number already exists'
                });
            }

            // Get current worker data
            const currentWorker = await workersListCollection.findOne({ _id: new ObjectId(id) });
            if (!currentWorker) {
                return res.status(404).json({
                    success: false,
                    message: 'Worker not found'
                });
            }

            const updateData = {
                name: name.trim(),
                mobile: mobile.trim(),
                designation: designation.trim(),
                department: department?.trim() || '',
                email: email?.trim() || '',
                address: address?.trim() || '',
                joiningDate: joiningDate || new Date(),
                salary: salary || '',
                experience: experience || '',
                bloodGroup: bloodGroup || '',
                gender: gender || '',
                dateOfBirth: dateOfBirth || '',
                responsibilities: responsibilities?.trim() || '',
                workShift: workShift || '',
                nidNumber: nidNumber || '',
                isActive: isActive !== undefined ? JSON.parse(isActive) : true,
                updatedAt: new Date()
            };

            // If new photo uploaded, update photo path and delete old photo
            if (req.file) {
                // Delete old photo file if exists
                if (currentWorker.photo && currentWorker.photo.startsWith('/api/uploads/worker-photos/')) {
                    const oldFilename = currentWorker.photo.replace('/api/uploads/worker-photos/', '');
                    const oldImagePath = path.join(__dirname, '..', 'uploads', 'worker-photos', oldFilename);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                    }
                }

                updateData.photo = `/api/uploads/worker-photos/${req.file.filename}`;
                updateData.photoOriginalName = req.file.originalname;
            }

            const result = await workersListCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.modifiedCount > 0) {
                const updatedWorker = await workersListCollection.findOne({ _id: new ObjectId(id) });
                res.json({
                    success: true,
                    message: 'Worker updated successfully',
                    data: updatedWorker
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Worker not found or no changes made'
                });
            }
        } catch (error) {
            console.error('Error updating worker:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update worker'
            });
        }
    });

    // DELETE worker
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            // Get worker data first to delete photo file
            const worker = await workersListCollection.findOne({ _id: new ObjectId(id) });
            
            if (!worker) {
                return res.status(404).json({
                    success: false,
                    message: 'Worker not found'
                });
            }

            // Delete photo file if exists
            if (worker.photo && worker.photo.startsWith('/api/uploads/worker-photos/')) {
                const filename = worker.photo.replace('/api/uploads/worker-photos/', '');
                const imagePath = path.join(__dirname, '..', 'uploads', 'worker-photos', filename);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }

            const result = await workersListCollection.deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount > 0) {
                res.json({
                    success: true,
                    message: 'Worker deleted successfully'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Worker not found'
                });
            }
        } catch (error) {
            console.error('Error deleting worker:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete worker'
            });
        }
    });

    // GET workers by department
    router.get('/department/:department', async (req, res) => {
        try {
            const { department } = req.params;
            const workers = await workersListCollection.find({ 
                department: new RegExp(department, 'i') 
            }).toArray();

            res.json({
                success: true,
                data: workers,
                count: workers.length
            });
        } catch (error) {
            console.error('Error fetching workers by department:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch workers by department'
            });
        }
    });

    // TOGGLE worker status
    router.patch('/:id/toggle', async (req, res) => {
        try {
            const worker = await workersListCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!worker) {
                return res.status(404).json({
                    success: false,
                    message: 'Worker not found'
                });
            }

            const result = await workersListCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { 
                    $set: { 
                        isActive: !worker.isActive,
                        updatedAt: new Date()
                    } 
                }
            );

            res.json({
                success: true,
                message: `Worker ${!worker.isActive ? 'activated' : 'deactivated'} successfully`,
                data: {
                    isActive: !worker.isActive
                }
            });
        } catch (error) {
            console.error('Error toggling worker status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to toggle worker status'
            });
        }
    });

    return router;
};