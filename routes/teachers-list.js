const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (teachersListCollection) => {

    // Configure multer for teacher photos
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

    // CREATE new teacher with file upload - UPDATED FIELDS
    router.post('/', upload.single('photo'), async (req, res) => {
        try {
            const { 
                smartId,
                fingerId,
                name, 
                mobile, 
                designation,
                biboron,
                salary, 
                position,
                session,
                staffType,
                // নতুন শিফট ফিল্ডগুলো
                shiftName,
                teacherEntryTime,
                teacherExitTime,
                countLateAfter,
                countEarlyExitBefore,
                sendSms,
                smsType,
                timezone,
                absentAfter
            } = req.body;

            // Validation - updated required fields
            if (!name || !mobile) {
                return res.status(400).json({
                    success: false,
                    message: 'Name and mobile are required fields'
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

            // Check if smartId already exists (if provided)
            if (smartId) {
                const existingSmartId = await teachersListCollection.findOne({ smartId });
                if (existingSmartId) {
                    return res.status(400).json({
                        success: false,
                        message: 'A teacher with this Smart ID already exists'
                    });
                }
            }

            // Check if fingerId already exists (if provided)
            if (fingerId) {
                const existingFingerId = await teachersListCollection.findOne({ fingerId });
                if (existingFingerId) {
                    return res.status(400).json({
                        success: false,
                        message: 'A teacher with this Finger ID already exists'
                    });
                }
            }

            const newTeacher = {
                smartId: smartId?.trim() || '',
                fingerId: fingerId?.trim() || '',
                name: name.trim(),
                mobile: mobile.trim(),
                designation: designation?.trim() || '',
                biboron: biboron?.trim() || '',
                salary: salary || '',
                position: position || 'Active',
                session: session?.trim() || '',
                staffType: staffType || 'Teacher',
                // নতুন শিফট ফিল্ডগুলো
                shiftName: shiftName?.trim() || '',
                teacherEntryTime: teacherEntryTime || '',
                teacherExitTime: teacherExitTime || '',
                countLateAfter: countLateAfter || '',
                countEarlyExitBefore: countEarlyExitBefore || '',
                sendSms: sendSms === 'true' || sendSms === true,
                smsType: smsType || '',
                timezone: timezone || 'Asia/Dhaka',
                absentAfter: absentAfter || '',
                photo: req.file ? `/api/uploads/teacher-photos/${req.file.filename}` : '',
                photoOriginalName: req.file ? req.file.originalname : '',
                isActive: position !== 'Deactivated', // Automatically set isActive based on position
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await teachersListCollection.insertOne(newTeacher);

            if (result.insertedId) {
                const createdTeacher = await teachersListCollection.findOne({ _id: result.insertedId });
                res.status(201).json({
                    success: true,
                    message: 'Teacher/Staff added successfully',
                    data: createdTeacher
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to add teacher/staff'
                });
            }
        } catch (error) {
            console.error('Error adding teacher:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add teacher/staff'
            });
        }
    });

    // UPDATE teacher with file upload - UPDATED FIELDS
    router.put('/:id', upload.single('photo'), async (req, res) => {
        try {
            const { id } = req.params;
            const { 
                smartId,
                fingerId,
                name, 
                mobile, 
                designation,
                biboron,
                salary, 
                position,
                session,
                staffType,
                // নতুন শিফট ফিল্ডগুলো
                shiftName,
                teacherEntryTime,
                teacherExitTime,
                countLateAfter,
                countEarlyExitBefore,
                sendSms,
                smsType,
                timezone,
                absentAfter
            } = req.body;

            // Validation - updated required fields
            if (!name || !mobile) {
                return res.status(400).json({
                    success: false,
                    message: 'Name and mobile are required fields'
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

            // Check if smartId already exists for other teachers (if provided)
            if (smartId) {
                const existingSmartId = await teachersListCollection.findOne({ 
                    smartId, 
                    _id: { $ne: new ObjectId(id) } 
                });
                if (existingSmartId) {
                    return res.status(400).json({
                        success: false,
                        message: 'A teacher with this Smart ID already exists'
                    });
                }
            }

            // Check if fingerId already exists for other teachers (if provided)
            if (fingerId) {
                const existingFingerId = await teachersListCollection.findOne({ 
                    fingerId, 
                    _id: { $ne: new ObjectId(id) } 
                });
                if (existingFingerId) {
                    return res.status(400).json({
                        success: false,
                        message: 'A teacher with this Finger ID already exists'
                    });
                }
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
                smartId: smartId?.trim() || '',
                fingerId: fingerId?.trim() || '',
                name: name.trim(),
                mobile: mobile.trim(),
                designation: designation?.trim() || '',
                biboron: biboron?.trim() || '',
                salary: salary || '',
                position: position || 'Active',
                session: session?.trim() || '',
                staffType: staffType || 'Teacher',
                // নতুন শিফট ফিল্ডগুলো
                shiftName: shiftName?.trim() || '',
                teacherEntryTime: teacherEntryTime || '',
                teacherExitTime: teacherExitTime || '',
                countLateAfter: countLateAfter || '',
                countEarlyExitBefore: countEarlyExitBefore || '',
                sendSms: sendSms === 'true' || sendSms === true,
                smsType: smsType || '',
                timezone: timezone || 'Asia/Dhaka',
                absentAfter: absentAfter || '',
                isActive: position !== 'Deactivated', // Automatically set isActive based on position
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
                    message: 'Teacher/Staff updated successfully',
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
                message: 'Failed to update teacher/staff'
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
                    message: 'Teacher/Staff deleted successfully'
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
                message: 'Failed to delete teacher/staff'
            });
        }
    });

    // GET teachers by staff type
    router.get('/type/:staffType', async (req, res) => {
        try {
            const { staffType } = req.params;
            const teachers = await teachersListCollection.find({ 
                staffType: new RegExp(staffType, 'i') 
            }).toArray();

            res.json({
                success: true,
                data: teachers,
                count: teachers.length
            });
        } catch (error) {
            console.error('Error fetching teachers by staff type:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch teachers by staff type'
            });
        }
    });

    // GET teachers by position
    router.get('/position/:position', async (req, res) => {
        try {
            const { position } = req.params;
            const teachers = await teachersListCollection.find({ 
                position: new RegExp(position, 'i') 
            }).toArray();

            res.json({
                success: true,
                data: teachers,
                count: teachers.length
            });
        } catch (error) {
            console.error('Error fetching teachers by position:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch teachers by position'
            });
        }
    });

    // SEARCH teachers with multiple criteria
    router.get('/search/filter', async (req, res) => {
        try {
            const { search, session, mobile, staffType, position } = req.query;
            
            let query = {};
            
            // Search by multiple fields
            if (search) {
                query.$or = [
                    { smartId: new RegExp(search, 'i') },
                    { name: new RegExp(search, 'i') },
                    { fingerId: new RegExp(search, 'i') },
                    { shiftName: new RegExp(search, 'i') }
                ];
            }
            
            // Filter by session
            if (session) {
                query.session = new RegExp(session, 'i');
            }
            
            // Filter by mobile
            if (mobile) {
                query.mobile = new RegExp(mobile, 'i');
            }
            
            // Filter by staff type
            if (staffType) {
                query.staffType = staffType;
            }
            
            // Filter by position
            if (position) {
                query.position = position;
            }

            const teachers = await teachersListCollection.find(query).toArray();

            res.json({
                success: true,
                data: teachers,
                count: teachers.length
            });
        } catch (error) {
            console.error('Error searching teachers:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to search teachers'
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
                        position: !teacher.isActive ? 'Active' : 'Deactivated',
                        updatedAt: new Date()
                    } 
                }
            );

            res.json({
                success: true,
                message: `Teacher ${!teacher.isActive ? 'activated' : 'deactivated'} successfully`,
                data: {
                    isActive: !teacher.isActive,
                    position: !teacher.isActive ? 'Active' : 'Deactivated'
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

    // GET teachers with shifts only
    router.get('/shifts/with-shifts', async (req, res) => {
        try {
            const teachersWithShifts = await teachersListCollection.find({
                $or: [
                    { shiftName: { $ne: '', $exists: true } },
                    { teacherEntryTime: { $ne: '', $exists: true } },
                    { teacherExitTime: { $ne: '', $exists: true } }
                ]
            }).toArray();

            res.json({
                success: true,
                data: teachersWithShifts,
                count: teachersWithShifts.length
            });
        } catch (error) {
            console.error('Error fetching teachers with shifts:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch teachers with shifts'
            });
        }
    });

    return router;
};