const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const upload = require('../middleware/upload'); // banners.js এর মতোই upload middleware ব্যবহার করো
const path = require('path');
const fs = require('fs');

module.exports = (teachersListCollection) => {

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
                message: 'Failed to fetch teachers list',
                error: error.message
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
                message: 'Failed to fetch teacher',
                error: error.message
            });
        }
    });

    // CREATE new teacher with file upload - banners.js style
    router.post('/', upload.fields([
        { name: 'photo', maxCount: 1 },
        { name: 'certificateImage1', maxCount: 1 },
        { name: 'certificateImage2', maxCount: 1 }
    ]), async (req, res) => {
        try {
            const { 
                // Personal Information
                teacherId,
                personalPhone,
                teacherSerial,
                teacherEmail,
                smartId,
                bloodGroup,
                name,
                gender,
                englishName,
                dob,

                // Address Information
                permanentVillage,
                permanentPostOffice,
                permanentThana,
                permanentDistrict,
                currentVillage,
                currentPostOffice,
                currentThana,
                currentDistrict,
                sameAsPermanent,

                // Professional Information
                designation,
                monthlySalary,
                department,
                staffType,
                joiningDate,
                residenceType,

                // Additional Information
                guardianPhone,
                youtubeChannel,
                facebookProfile,
                position,
                twitterProfile,
                language,

                // Session Information
                session,

                // Certificate Information
                certificateName1,
                certificateName2,

                // Existing fields
                fingerId,
                biboron,
                salary
            } = req.body;

            // Validation - updated required fields
            if (!name || !personalPhone) {
                return res.status(400).json({
                    success: false,
                    message: 'Name and personal phone are required fields'
                });
            }

            // Check if personal phone already exists
            const existingTeacher = await teachersListCollection.findOne({ personalPhone });
            if (existingTeacher) {
                return res.status(400).json({
                    success: false,
                    message: 'A teacher with this personal phone number already exists'
                });
            }

            // Mobile number validation
            const mobileRegex = /^[0-9]{11}$/;
            if (!mobileRegex.test(personalPhone)) {
                return res.status(400).json({
                    success: false,
                    message: 'Please enter a valid 11-digit mobile number'
                });
            }

            // Check if teacherId already exists (if provided)
            if (teacherId) {
                const existingTeacherId = await teachersListCollection.findOne({ teacherId });
                if (existingTeacherId) {
                    return res.status(400).json({
                        success: false,
                        message: 'A teacher with this Teacher ID already exists'
                    });
                }
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
                // Personal Information
                teacherId: teacherId?.trim() || '',
                personalPhone: personalPhone.trim(),
                teacherSerial: teacherSerial?.trim() || '',
                teacherEmail: teacherEmail?.trim() || '',
                smartId: smartId?.trim() || '',
                bloodGroup: bloodGroup || '',
                name: name.trim(),
                gender: gender || 'Male',
                englishName: englishName?.trim() || '',
                dob: dob || '',

                // Address Information
                permanentVillage: permanentVillage?.trim() || '',
                permanentPostOffice: permanentPostOffice?.trim() || '',
                permanentThana: permanentThana?.trim() || '',
                permanentDistrict: permanentDistrict?.trim() || '',
                currentVillage: currentVillage?.trim() || '',
                currentPostOffice: currentPostOffice?.trim() || '',
                currentThana: currentThana?.trim() || '',
                currentDistrict: currentDistrict?.trim() || '',
                sameAsPermanent: sameAsPermanent === 'true' || sameAsPermanent === true,

                // Professional Information
                designation: designation?.trim() || '',
                monthlySalary: monthlySalary || '',
                department: department?.trim() || '',
                staffType: staffType || 'Teacher',
                joiningDate: joiningDate || '',
                residenceType: residenceType || 'Permanent',

                // Additional Information
                guardianPhone: guardianPhone?.trim() || '',
                youtubeChannel: youtubeChannel?.trim() || '',
                facebookProfile: facebookProfile?.trim() || '',
                position: position || 'Active',
                twitterProfile: twitterProfile?.trim() || '',
                language: language || 'Bangla',

                // Session Information
                session: session?.trim() || '',

                // Certificate Information
                certificateName1: certificateName1?.trim() || '',
                certificateName2: certificateName2?.trim() || '',

                // Existing fields
                fingerId: fingerId?.trim() || '',
                biboron: biboron?.trim() || '',
                salary: salary || '',

                // File paths - banners.js style
                photo: req.files['photo'] ? `/api/uploads/${req.files['photo'][0].filename}` : '',
                photoOriginalName: req.files['photo'] ? req.files['photo'][0].originalname : '',
                photoSize: req.files['photo'] ? req.files['photo'][0].size : null,
                photoMimeType: req.files['photo'] ? req.files['photo'][0].mimetype : '',

                certificateImage1: req.files['certificateImage1'] ? `/api/uploads/${req.files['certificateImage1'][0].filename}` : '',
                certificateImage1OriginalName: req.files['certificateImage1'] ? req.files['certificateImage1'][0].originalname : '',
                certificateImage1Size: req.files['certificateImage1'] ? req.files['certificateImage1'][0].size : null,
                certificateImage1MimeType: req.files['certificateImage1'] ? req.files['certificateImage1'][0].mimetype : '',

                certificateImage2: req.files['certificateImage2'] ? `/api/uploads/${req.files['certificateImage2'][0].filename}` : '',
                certificateImage2OriginalName: req.files['certificateImage2'] ? req.files['certificateImage2'][0].originalname : '',
                certificateImage2Size: req.files['certificateImage2'] ? req.files['certificateImage2'][0].size : null,
                certificateImage2MimeType: req.files['certificateImage2'] ? req.files['certificateImage2'][0].mimetype : '',

                isActive: position !== 'Deactivated',
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
                // banners.js style error handling - uploaded files delete করো
                if (req.files) {
                    Object.values(req.files).forEach(fileArray => {
                        fileArray.forEach(file => {
                            const filePath = path.join(__dirname, '..', 'uploads', file.filename);
                            if (fs.existsSync(filePath)) {
                                fs.unlinkSync(filePath);
                            }
                        });
                    });
                }
                
                res.status(400).json({
                    success: false,
                    message: 'Failed to add teacher/staff'
                });
            }
        } catch (error) {
            // banners.js style error handling
            if (req.files) {
                Object.values(req.files).forEach(fileArray => {
                    fileArray.forEach(file => {
                        const filePath = path.join(__dirname, '..', 'uploads', file.filename);
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                    });
                });
            }
            
            console.error('Error adding teacher:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add teacher/staff',
                error: error.message
            });
        }
    });

    // UPDATE teacher with file upload - banners.js style
    router.put('/:id', upload.fields([
        { name: 'photo', maxCount: 1 },
        { name: 'certificateImage1', maxCount: 1 },
        { name: 'certificateImage2', maxCount: 1 }
    ]), async (req, res) => {
        try {
            const { id } = req.params;
            const { 
                // Personal Information
                teacherId,
                personalPhone,
                teacherSerial,
                teacherEmail,
                smartId,
                bloodGroup,
                name,
                gender,
                englishName,
                dob,

                // Address Information
                permanentVillage,
                permanentPostOffice,
                permanentThana,
                permanentDistrict,
                currentVillage,
                currentPostOffice,
                currentThana,
                currentDistrict,
                sameAsPermanent,

                // Professional Information
                designation,
                monthlySalary,
                department,
                staffType,
                joiningDate,
                residenceType,

                // Additional Information
                guardianPhone,
                youtubeChannel,
                facebookProfile,
                position,
                twitterProfile,
                language,

                // Session Information
                session,

                // Certificate Information
                certificateName1,
                certificateName2,

                // Existing fields
                fingerId,
                biboron,
                salary
            } = req.body;

            // Validation - updated required fields
            if (!name || !personalPhone) {
                return res.status(400).json({
                    success: false,
                    message: 'Name and personal phone are required fields'
                });
            }

            // Check if personal phone already exists for other teachers
            const existingTeacher = await teachersListCollection.findOne({ 
                personalPhone, 
                _id: { $ne: new ObjectId(id) } 
            });
            
            if (existingTeacher) {
                return res.status(400).json({
                    success: false,
                    message: 'A teacher with this personal phone number already exists'
                });
            }

            // Check if teacherId already exists for other teachers (if provided)
            if (teacherId) {
                const existingTeacherId = await teachersListCollection.findOne({ 
                    teacherId, 
                    _id: { $ne: new ObjectId(id) } 
                });
                if (existingTeacherId) {
                    return res.status(400).json({
                        success: false,
                        message: 'A teacher with this Teacher ID already exists'
                    });
                }
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
                // Personal Information
                teacherId: teacherId?.trim() || '',
                personalPhone: personalPhone.trim(),
                teacherSerial: teacherSerial?.trim() || '',
                teacherEmail: teacherEmail?.trim() || '',
                smartId: smartId?.trim() || '',
                bloodGroup: bloodGroup || '',
                name: name.trim(),
                gender: gender || 'Male',
                englishName: englishName?.trim() || '',
                dob: dob || '',

                // Address Information
                permanentVillage: permanentVillage?.trim() || '',
                permanentPostOffice: permanentPostOffice?.trim() || '',
                permanentThana: permanentThana?.trim() || '',
                permanentDistrict: permanentDistrict?.trim() || '',
                currentVillage: currentVillage?.trim() || '',
                currentPostOffice: currentPostOffice?.trim() || '',
                currentThana: currentThana?.trim() || '',
                currentDistrict: currentDistrict?.trim() || '',
                sameAsPermanent: sameAsPermanent === 'true' || sameAsPermanent === true,

                // Professional Information
                designation: designation?.trim() || '',
                monthlySalary: monthlySalary || '',
                department: department?.trim() || '',
                staffType: staffType || 'Teacher',
                joiningDate: joiningDate || '',
                residenceType: residenceType || 'Permanent',

                // Additional Information
                guardianPhone: guardianPhone?.trim() || '',
                youtubeChannel: youtubeChannel?.trim() || '',
                facebookProfile: facebookProfile?.trim() || '',
                position: position || 'Active',
                twitterProfile: twitterProfile?.trim() || '',
                language: language || 'Bangla',

                // Session Information
                session: session?.trim() || '',

                // Certificate Information
                certificateName1: certificateName1?.trim() || '',
                certificateName2: certificateName2?.trim() || '',

                // Existing fields
                fingerId: fingerId?.trim() || '',
                biboron: biboron?.trim() || '',
                salary: salary || '',

                isActive: position !== 'Deactivated',
                updatedAt: new Date()
            };

            // Handle file uploads and delete old files - banners.js style
            if (req.files) {
                // Handle profile photo
                if (req.files['photo']) {
                    // Delete old photo file if exists - banners.js style
                    if (currentTeacher.photo && currentTeacher.photo.startsWith('/api/uploads/')) {
                        const oldFilename = currentTeacher.photo.replace('/api/uploads/', '');
                        const oldImagePath = path.join(__dirname, '..', 'uploads', oldFilename);
                        if (fs.existsSync(oldImagePath)) {
                            fs.unlinkSync(oldImagePath);
                        }
                    }
                    updateData.photo = `/api/uploads/${req.files['photo'][0].filename}`;
                    updateData.photoOriginalName = req.files['photo'][0].originalname;
                    updateData.photoSize = req.files['photo'][0].size;
                    updateData.photoMimeType = req.files['photo'][0].mimetype;
                }

                // Handle certificate 1
                if (req.files['certificateImage1']) {
                    // Delete old certificate file if exists - banners.js style
                    if (currentTeacher.certificateImage1 && currentTeacher.certificateImage1.startsWith('/api/uploads/')) {
                        const oldFilename = currentTeacher.certificateImage1.replace('/api/uploads/', '');
                        const oldFilePath = path.join(__dirname, '..', 'uploads', oldFilename);
                        if (fs.existsSync(oldFilePath)) {
                            fs.unlinkSync(oldFilePath);
                        }
                    }
                    updateData.certificateImage1 = `/api/uploads/${req.files['certificateImage1'][0].filename}`;
                    updateData.certificateImage1OriginalName = req.files['certificateImage1'][0].originalname;
                    updateData.certificateImage1Size = req.files['certificateImage1'][0].size;
                    updateData.certificateImage1MimeType = req.files['certificateImage1'][0].mimetype;
                }

                // Handle certificate 2
                if (req.files['certificateImage2']) {
                    // Delete old certificate file if exists - banners.js style
                    if (currentTeacher.certificateImage2 && currentTeacher.certificateImage2.startsWith('/api/uploads/')) {
                        const oldFilename = currentTeacher.certificateImage2.replace('/api/uploads/', '');
                        const oldFilePath = path.join(__dirname, '..', 'uploads', oldFilename);
                        if (fs.existsSync(oldFilePath)) {
                            fs.unlinkSync(oldFilePath);
                        }
                    }
                    updateData.certificateImage2 = `/api/uploads/${req.files['certificateImage2'][0].filename}`;
                    updateData.certificateImage2OriginalName = req.files['certificateImage2'][0].originalname;
                    updateData.certificateImage2Size = req.files['certificateImage2'][0].size;
                    updateData.certificateImage2MimeType = req.files['certificateImage2'][0].mimetype;
                }
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
                message: 'Failed to update teacher/staff',
                error: error.message
            });
        }
    });

    // DELETE teacher - banners.js style
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            // Get teacher data first to delete files
            const teacher = await teachersListCollection.findOne({ _id: new ObjectId(id) });
            
            if (!teacher) {
                return res.status(404).json({
                    success: false,
                    message: 'Teacher not found'
                });
            }

            // Delete photo file if exists - banners.js style
            if (teacher.photo && teacher.photo.startsWith('/api/uploads/')) {
                const filename = teacher.photo.replace('/api/uploads/', '');
                const imagePath = path.join(__dirname, '..', 'uploads', filename);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }

            // Delete certificate files if exist - banners.js style
            if (teacher.certificateImage1 && teacher.certificateImage1.startsWith('/api/uploads/')) {
                const filename = teacher.certificateImage1.replace('/api/uploads/', '');
                const filePath = path.join(__dirname, '..', 'uploads', filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }

            if (teacher.certificateImage2 && teacher.certificateImage2.startsWith('/api/uploads/')) {
                const filename = teacher.certificateImage2.replace('/api/uploads/', '');
                const filePath = path.join(__dirname, '..', 'uploads', filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
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
                message: 'Failed to delete teacher/staff',
                error: error.message
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
                message: 'Failed to fetch teachers by staff type',
                error: error.message
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
                message: 'Failed to fetch teachers by position',
                error: error.message
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
                message: 'Failed to search teachers',
                error: error.message
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
                message: 'Failed to toggle teacher status',
                error: error.message
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
                message: 'Failed to fetch teachers with shifts',
                error: error.message
            });
        }
    });

    return router;
};