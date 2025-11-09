const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ObjectId } = require('mongodb');

// Multer configuration for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/students/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'student-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

module.exports = (studentsCollection, classesCollection, sectionsCollection, batchesCollection, sessionsCollection, teachersCollection) => {

    // GET all students with filtering
    router.get('/', async (req, res) => {
        try {
            const { search, classId, status } = req.query;
            
            let filter = {};
            
            if (search) {
                filter.$or = [
                    { studentId: { $regex: search, $options: 'i' } },
                    { smartId: { $regex: search, $options: 'i' } },
                    { name: { $regex: search, $options: 'i' } },
                    { dakhelaNumber: { $regex: search, $options: 'i' } }
                ];
            }
            
            if (classId) {
                filter.classId = new ObjectId(classId);
            }
            
            if (status) {
                filter.status = status;
            }

            const students = await studentsCollection.aggregate([
                {
                    $match: filter
                },
                {
                    $lookup: {
                        from: 'classes',
                        localField: 'classId',
                        foreignField: '_id',
                        as: 'class'
                    }
                },
                {
                    $lookup: {
                        from: 'sections',
                        localField: 'sectionId',
                        foreignField: '_id',
                        as: 'section'
                    }
                },
                {
                    $lookup: {
                        from: 'batches',
                        localField: 'batchId',
                        foreignField: '_id',
                        as: 'batch'
                    }
                },
                {
                    $lookup: {
                        from: 'sessions',
                        localField: 'sessionId',
                        foreignField: '_id',
                        as: 'session'
                    }
                },
                {
                    $lookup: {
                        from: 'teachers',
                        localField: 'mentorId',
                        foreignField: '_id',
                        as: 'mentor'
                    }
                },
                {
                    $unwind: {
                        path: '$class',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $unwind: {
                        path: '$section',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $unwind: {
                        path: '$batch',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $unwind: {
                        path: '$session',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $unwind: {
                        path: '$mentor',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        studentId: 1,
                        smartId: 1,
                        dakhelaNumber: 1,
                        name: 1,
                        classRoll: 1,
                        status: 1,
                        photo: 1,
                        mobile: 1,
                        parentMobile: 1,
                        totalFees: 1,
                        paidFees: 1,
                        dueFees: 1,
                        createdAt: 1,
                        'class.name': 1,
                        'section.name': 1,
                        'batch.name': 1,
                        'session.name': 1,
                        'mentor.name': 1
                    }
                },
                {
                    $sort: { createdAt: -1 }
                }
            ]).toArray();

            // Get total students count
            const totalStudents = await studentsCollection.countDocuments();

            res.json({
                success: true,
                data: students,
                total: totalStudents,
                message: 'Students fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching students:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching students',
                error: error.message
            });
        }
    });

    // GET single student by ID
    router.get('/:id', async (req, res) => {
        try {
            const student = await studentsCollection.aggregate([
                {
                    $match: { _id: new ObjectId(req.params.id) }
                },
                {
                    $lookup: {
                        from: 'classes',
                        localField: 'classId',
                        foreignField: '_id',
                        as: 'class'
                    }
                },
                {
                    $lookup: {
                        from: 'sections',
                        localField: 'sectionId',
                        foreignField: '_id',
                        as: 'section'
                    }
                },
                {
                    $lookup: {
                        from: 'batches',
                        localField: 'batchId',
                        foreignField: '_id',
                        as: 'batch'
                    }
                },
                {
                    $lookup: {
                        from: 'sessions',
                        localField: 'sessionId',
                        foreignField: '_id',
                        as: 'session'
                    }
                },
                {
                    $lookup: {
                        from: 'teachers',
                        localField: 'mentorId',
                        foreignField: '_id',
                        as: 'mentor'
                    }
                },
                {
                    $unwind: {
                        path: '$class',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $unwind: {
                        path: '$section',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $unwind: {
                        path: '$batch',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $unwind: {
                        path: '$session',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $unwind: {
                        path: '$mentor',
                        preserveNullAndEmptyArrays: true
                    }
                }
            ]).toArray();

            if (!student || student.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Student not found'
                });
            }

            res.json({
                success: true,
                data: student[0]
            });
        } catch (error) {
            console.error('Error fetching student:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching student',
                error: error.message
            });
        }
    });

    // CREATE new student
    router.post('/', upload.single('photo'), async (req, res) => {
        try {
            const studentData = req.body;
            
            // Required fields validation
            if (!studentData.name || !studentData.classId || !studentData.classRoll) {
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(400).json({
                    success: false,
                    message: 'Name, class, and class roll are required'
                });
            }

            // Generate student ID
            const year = new Date().getFullYear().toString().slice(-2);
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            const studentId = `ST${year}${randomNum}`;

            const newStudent = {
                studentId,
                smartId: studentData.smartId || '',
                dakhelaNumber: studentData.dakhelaNumber || '',
                name: studentData.name,
                dob: studentData.dob ? new Date(studentData.dob) : null,
                birthRegistration: studentData.birthRegistration || '',
                gender: studentData.gender || 'male',
                mobile: studentData.mobile || '',
                bloodGroup: studentData.bloodGroup || '',
                photo: req.file ? `/uploads/students/${req.file.filename}` : '',
                attachmentType: studentData.attachmentType || '',

                // Family Information
                fatherName: studentData.fatherName || '',
                motherName: studentData.motherName || '',
                guardianName: studentData.guardianName || '',
                guardianMobile: studentData.guardianMobile || '',
                relation: studentData.relation || '',
                guardianNid: studentData.guardianNid || '',

                // Address Information
                permanentVillage: studentData.permanentVillage || '',
                permanentPostOffice: studentData.permanentPostOffice || '',
                permanentDistrict: studentData.permanentDistrict || '',
                permanentThana: studentData.permanentThana || '',
                currentVillage: studentData.currentVillage || '',
                currentPostOffice: studentData.currentPostOffice || '',
                currentDistrict: studentData.currentDistrict || '',
                currentThana: studentData.currentThana || '',
                sameAsPermanent: studentData.sameAsPermanent === 'true',

                // Academic Information
                classId: new ObjectId(studentData.classId),
                batchId: studentData.batchId ? new ObjectId(studentData.batchId) : null,
                sectionId: studentData.sectionId ? new ObjectId(studentData.sectionId) : null,
                sessionId: studentData.sessionId ? new ObjectId(studentData.sessionId) : null,
                classRoll: parseInt(studentData.classRoll),
                additionalNote: studentData.additionalNote || '',
                status: studentData.status || 'active',
                studentType: studentData.studentType || 'non_residential',
                mentorId: studentData.mentorId ? new ObjectId(studentData.mentorId) : null,

                // Fee Information
                admissionFee: studentData.admissionFee ? parseFloat(studentData.admissionFee) : 0,
                monthlyFee: studentData.monthlyFee ? parseFloat(studentData.monthlyFee) : 0,
                previousDues: studentData.previousDues ? parseFloat(studentData.previousDues) : 0,
                sessionFee: studentData.sessionFee ? parseFloat(studentData.sessionFee) : 0,
                boardingFee: studentData.boardingFee ? parseFloat(studentData.boardingFee) : 0,
                otherFee: studentData.otherFee ? parseFloat(studentData.otherFee) : 0,
                transportFee: studentData.transportFee ? parseFloat(studentData.transportFee) : 0,
                residenceFee: studentData.residenceFee ? parseFloat(studentData.residenceFee) : 0,

                // Other Settings
                sendAdmissionSMS: studentData.sendAdmissionSMS === 'true',
                studentSerial: parseInt(studentData.studentSerial) || 0,
                sendAttendanceSMS: studentData.sendAttendanceSMS === 'true',

                // Calculate total fees
                totalFees: 0,
                paidFees: 0,
                dueFees: 0,

                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Calculate total fees
            newStudent.totalFees = 
                newStudent.admissionFee +
                newStudent.monthlyFee +
                newStudent.previousDues +
                newStudent.sessionFee +
                newStudent.boardingFee +
                newStudent.otherFee +
                newStudent.transportFee +
                newStudent.residenceFee;
            
            newStudent.dueFees = newStudent.totalFees;

            const result = await studentsCollection.insertOne(newStudent);
            
            res.status(201).json({
                success: true,
                message: 'Student created successfully',
                data: {
                    _id: result.insertedId,
                    ...newStudent
                }
            });
        } catch (error) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            console.error('Error creating student:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating student',
                error: error.message
            });
        }
    });

    // UPDATE student
    router.put('/:id', upload.single('photo'), async (req, res) => {
        try {
            const { id } = req.params;
            const studentData = req.body;

            const existingStudent = await studentsCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingStudent) {
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(404).json({
                    success: false,
                    message: 'Student not found'
                });
            }

            const updateData = {
                ...studentData,
                updatedAt: new Date()
            };

            // Handle ObjectId conversions
            if (studentData.classId) updateData.classId = new ObjectId(studentData.classId);
            if (studentData.batchId) updateData.batchId = new ObjectId(studentData.batchId);
            if (studentData.sectionId) updateData.sectionId = new ObjectId(studentData.sectionId);
            if (studentData.sessionId) updateData.sessionId = new ObjectId(studentData.sessionId);
            if (studentData.mentorId) updateData.mentorId = new ObjectId(studentData.mentorId);

            // Handle number conversions
            if (studentData.classRoll) updateData.classRoll = parseInt(studentData.classRoll);
            if (studentData.studentSerial) updateData.studentSerial = parseInt(studentData.studentSerial);
            if (studentData.admissionFee) updateData.admissionFee = parseFloat(studentData.admissionFee);
            if (studentData.monthlyFee) updateData.monthlyFee = parseFloat(studentData.monthlyFee);
            if (studentData.previousDues) updateData.previousDues = parseFloat(studentData.previousDues);
            if (studentData.sessionFee) updateData.sessionFee = parseFloat(studentData.sessionFee);
            if (studentData.boardingFee) updateData.boardingFee = parseFloat(studentData.boardingFee);
            if (studentData.otherFee) updateData.otherFee = parseFloat(studentData.otherFee);
            if (studentData.transportFee) updateData.transportFee = parseFloat(studentData.transportFee);
            if (studentData.residenceFee) updateData.residenceFee = parseFloat(studentData.residenceFee);

            // Handle boolean conversions
            updateData.sameAsPermanent = studentData.sameAsPermanent === 'true';
            updateData.sendAdmissionSMS = studentData.sendAdmissionSMS === 'true';
            updateData.sendAttendanceSMS = studentData.sendAttendanceSMS === 'true';

            // Handle photo update
            if (req.file) {
                // Delete old photo if exists
                if (existingStudent.photo) {
                    const oldPhotoPath = path.join(__dirname, '..', '..', existingStudent.photo);
                    if (fs.existsSync(oldPhotoPath)) {
                        fs.unlinkSync(oldPhotoPath);
                    }
                }
                updateData.photo = `/uploads/students/${req.file.filename}`;
            }

            // Recalculate total fees
            updateData.totalFees = 
                (updateData.admissionFee || existingStudent.admissionFee) +
                (updateData.monthlyFee || existingStudent.monthlyFee) +
                (updateData.previousDues || existingStudent.previousDues) +
                (updateData.sessionFee || existingStudent.sessionFee) +
                (updateData.boardingFee || existingStudent.boardingFee) +
                (updateData.otherFee || existingStudent.otherFee) +
                (updateData.transportFee || existingStudent.transportFee) +
                (updateData.residenceFee || existingStudent.residenceFee);

            const result = await studentsCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            res.json({
                success: true,
                message: 'Student updated successfully'
            });
        } catch (error) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            console.error('Error updating student:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating student',
                error: error.message
            });
        }
    });

    // DELETE student
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const student = await studentsCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!student) {
                return res.status(404).json({
                    success: false,
                    message: 'Student not found'
                });
            }

            // Delete photo file if exists
            if (student.photo) {
                const photoPath = path.join(__dirname, '..', '..', student.photo);
                if (fs.existsSync(photoPath)) {
                    fs.unlinkSync(photoPath);
                }
            }

            await studentsCollection.deleteOne({ 
                _id: new ObjectId(id) 
            });

            res.json({
                success: true,
                message: 'Student deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting student:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting student',
                error: error.message
            });
        }
    });

    return router;
};