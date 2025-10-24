const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (teachersListCollection) => {

    // Configure multer for teacher photos - banners এর মতোই
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            const uploadDir = path.join(__dirname, '../uploads/teacher-photos');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, 'teacher-' + uniqueSuffix + path.extname(file.originalname));
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

    // GET all teachers
    router.get('/', async (req, res) => {
        try {
            const teachers = await teachersListCollection.find({}).toArray();
            res.json({
                success: true,
                data: teachers,
                count: teachers.length
            });
        } catch (error) {
            console.error('Error fetching teachers:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch teachers list'
            });
        }
    });

    // GET single teacher by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const teacher = await teachersListCollection.findOne({ _id: new ObjectId(id) });

            if (!teacher) {
                return res.status(404).json({
                    success: false,
                    message: 'Teacher not found'
                });
            }

            res.json({
                success: true,
                data: teacher
            });
        } catch (error) {
            console.error('Error fetching teacher:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch teacher'
            });
        }
    });

    // CREATE new teacher with file upload - banners এর মতোই system
    router.post('/', upload.single('photo'), async (req, res) => {
        try {
            const { 
                name, 
                mobile, 
                subject, 
                email, 
                address, 
                joiningDate, 
                qualifications, 
                designation, 
                department, 
                salary, 
                experience, 
                bloodGroup, 
                gender, 
                dateOfBirth 
            } = req.body;

            // Validation
            if (!name || !mobile || !subject) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, mobile and subject are required fields'
                });
            }

            // Check if mobile already exists
            const existingTeacher = await teachersListCollection.findOne({ mobile });
            if (existingTeacher) {
                return res.status(400).json({
                    success: false,
                    message: 'A teacher with this mobile number already exists'
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

            const newTeacher = {
                name: name.trim(),
                mobile: mobile.trim(),
                subject: subject.trim(),
                email: email?.trim() || '',
                address: address?.trim() || '',
                joiningDate: joiningDate || new Date(),
                qualifications: qualifications?.trim() || '',
                photo: req.file ? `/api/uploads/teacher-photos/${req.file.filename}` : '', // banners এর মতোই
                photoOriginalName: req.file ? req.file.originalname : '',
                designation: designation?.trim() || '',
                department: department?.trim() || '',
                salary: salary || '',
                experience: experience || '',
                bloodGroup: bloodGroup || '',
                gender: gender || '',
                dateOfBirth: dateOfBirth || '',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await teachersListCollection.insertOne(newTeacher);

            if (result.insertedId) {
                const createdTeacher = await teachersListCollection.findOne({ _id: result.insertedId });
                res.status(201).json({
                    success: true,
                    message: 'Teacher added successfully',
                    data: createdTeacher
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to add teacher'
                });
            }
        } catch (error) {
            console.error('Error adding teacher:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add teacher'
            });
        }
    });

    // UPDATE teacher with file upload
    router.put('/:id', upload.single('photo'), async (req, res) => {
        try {
            const { id } = req.params;
            const { 
                name, 
                mobile, 
                subject, 
                email, 
                address, 
                joiningDate, 
                qualifications, 
                designation, 
                department, 
                salary, 
                experience, 
                bloodGroup, 
                gender, 
                dateOfBirth, 
                isActive 
            } = req.body;

            // Validation
            if (!name || !mobile || !subject) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, mobile and subject are required fields'
                });
            }

            // Check if mobile already exists for other teachers
            const existingTeacher = await teachersListCollection.findOne({ 
                mobile, 
                _id: { $ne: new ObjectId(id) } 
            });
            
            if (existingTeacher) {
                return res.status(400).json({
                    success: false,
                    message: 'A teacher with this mobile number already exists'
                });
            }

            // Get current teacher data
            const currentTeacher = await teachersListCollection.findOne({ _id: new ObjectId(id) });
            if (!currentTeacher) {
                return res.status(404).json({
                    success: false,
                    message: 'Teacher not found'
                });
            }

            const updateData = {
                name: name.trim(),
                mobile: mobile.trim(),
                subject: subject.trim(),
                email: email?.trim() || '',
                address: address?.trim() || '',
                joiningDate: joiningDate || new Date(),
                qualifications: qualifications?.trim() || '',
                designation: designation?.trim() || '',
                department: department?.trim() || '',
                salary: salary || '',
                experience: experience || '',
                bloodGroup: bloodGroup || '',
                gender: gender || '',
                dateOfBirth: dateOfBirth || '',
                isActive: isActive !== undefined ? JSON.parse(isActive) : true,
                updatedAt: new Date()
            };

            // If new photo uploaded, update photo path and delete old photo
            if (req.file) {
                // Delete old photo file if exists
                if (currentTeacher.photo && currentTeacher.photo.startsWith('/api/uploads/teacher-photos/')) {
                    const oldFilename = currentTeacher.photo.replace('/api/uploads/teacher-photos/', '');
                    const oldImagePath = path.join(__dirname, '..', 'uploads', 'teacher-photos', oldFilename);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                    }
                }

                updateData.photo = `/api/uploads/teacher-photos/${req.file.filename}`;
                updateData.photoOriginalName = req.file.originalname;
            }

            const result = await teachersListCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.modifiedCount > 0) {
                const updatedTeacher = await teachersListCollection.findOne({ _id: new ObjectId(id) });
                res.json({
                    success: true,
                    message: 'Teacher updated successfully',
                    data: updatedTeacher
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Teacher not found or no changes made'
                });
            }
        } catch (error) {
            console.error('Error updating teacher:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update teacher'
            });
        }
    });

    // DELETE teacher
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            // Get teacher data first to delete photo file
            const teacher = await teachersListCollection.findOne({ _id: new ObjectId(id) });
            
            if (!teacher) {
                return res.status(404).json({
                    success: false,
                    message: 'Teacher not found'
                });
            }

            // Delete photo file if exists
            if (teacher.photo && teacher.photo.startsWith('/api/uploads/teacher-photos/')) {
                const filename = teacher.photo.replace('/api/uploads/teacher-photos/', '');
                const imagePath = path.join(__dirname, '..', 'uploads', 'teacher-photos', filename);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }

            const result = await teachersListCollection.deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount > 0) {
                res.json({
                    success: true,
                    message: 'Teacher deleted successfully'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Teacher not found'
                });
            }
        } catch (error) {
            console.error('Error deleting teacher:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete teacher'
            });
        }
    });

    // GET teachers by subject
    router.get('/subject/:subject', async (req, res) => {
        try {
            const { subject } = req.params;
            const teachers = await teachersListCollection.find({ 
                subject: new RegExp(subject, 'i') 
            }).toArray();

            res.json({
                success: true,
                data: teachers,
                count: teachers.length
            });
        } catch (error) {
            console.error('Error fetching teachers by subject:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch teachers by subject'
            });
        }
    });

    // TOGGLE teacher status
    router.patch('/:id/toggle', async (req, res) => {
        try {
            const teacher = await teachersListCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!teacher) {
                return res.status(404).json({
                    success: false,
                    message: 'Teacher not found'
                });
            }

            const result = await teachersListCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { 
                    $set: { 
                        isActive: !teacher.isActive,
                        updatedAt: new Date()
                    } 
                }
            );

            res.json({
                success: true,
                message: `Teacher ${!teacher.isActive ? 'activated' : 'deactivated'} successfully`,
                data: {
                    isActive: !teacher.isActive
                }
            });
        } catch (error) {
            console.error('Error toggling teacher status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to toggle teacher status'
            });
        }
    });

    // Remove the separate upload route since we're handling upload in POST/PUT
    // router.post('/teacher-photo', upload.single('photo'), ... // REMOVE THIS

    return router;
};