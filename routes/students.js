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
                    { dakhelaNumber: { $regex: search, $options: 'i' } },
                    { fatherName: { $regex: search, $options: 'i' } },
                    { mobile: { $regex: search, $options: 'i' } }
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
                        fatherName: 1,
                        motherName: 1,
                        guardianName: 1,
                        guardianMobile: 1,
                        totalFees: 1,
                        paidFees: 1,
                        dueFees: 1,
                        createdAt: 1,
                        'class.name': 1,
                        'class._id': 1,
                        'section.name': 1,
                        'section._id': 1,
                        'batch.name': 1,
                        'batch._id': 1,
                        'session.name': 1,
                        'session._id': 1,
                        'mentor.name': 1,
                        'mentor._id': 1
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

            // Parse numeric values safely
            const parseFloatSafe = (value) => {
                if (!value || value === '') return 0;
                const parsed = parseFloat(value);
                return isNaN(parsed) ? 0 : parsed;
            };

            const parseIntSafe = (value) => {
                if (!value || value === '') return 0;
                const parsed = parseInt(value);
                return isNaN(parsed) ? 0 : parsed;
            };

            const parseBoolean = (value) => {
                if (value === 'true' || value === true || value === '1') return true;
                if (value === 'false' || value === false || value === '0') return false;
                return Boolean(value);
            };

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
                sameAsPermanent: parseBoolean(studentData.sameAsPermanent),

                // Academic Information
                classId: new ObjectId(studentData.classId),
                batchId: studentData.batchId ? new ObjectId(studentData.batchId) : null,
                sectionId: studentData.sectionId ? new ObjectId(studentData.sectionId) : null,
                sessionId: studentData.sessionId ? new ObjectId(studentData.sessionId) : null,
                classRoll: parseIntSafe(studentData.classRoll),
                additionalNote: studentData.additionalNote || '',
                status: studentData.status || 'active',
                studentType: studentData.studentType || 'non_residential',
                mentorId: studentData.mentorId ? new ObjectId(studentData.mentorId) : null,

                // Fee Information
                admissionFee: parseFloatSafe(studentData.admissionFee),
                monthlyFee: parseFloatSafe(studentData.monthlyFee),
                previousDues: parseFloatSafe(studentData.previousDues),
                sessionFee: parseFloatSafe(studentData.sessionFee),
                boardingFee: parseFloatSafe(studentData.boardingFee),
                otherFee: parseFloatSafe(studentData.otherFee),
                transportFee: parseFloatSafe(studentData.transportFee),
                residenceFee: parseFloatSafe(studentData.residenceFee),

                // Other Settings
                sendAdmissionSMS: parseBoolean(studentData.sendAdmissionSMS),
                studentSerial: parseIntSafe(studentData.studentSerial),
                sendAttendanceSMS: parseBoolean(studentData.sendAttendanceSMS),

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

            // Parse numeric values safely
            const parseFloatSafe = (value) => {
                if (!value || value === '') return 0;
                const parsed = parseFloat(value);
                return isNaN(parsed) ? 0 : parsed;
            };

            const parseIntSafe = (value) => {
                if (!value || value === '') return 0;
                const parsed = parseInt(value);
                return isNaN(parsed) ? 0 : parsed;
            };

            const parseBoolean = (value) => {
                if (value === 'true' || value === true || value === '1') return true;
                if (value === 'false' || value === false || value === '0') return false;
                return Boolean(value);
            };

            const updateData = {
                updatedAt: new Date()
            };

            // Personal Information
            if (studentData.name !== undefined) updateData.name = studentData.name;
            if (studentData.smartId !== undefined) updateData.smartId = studentData.smartId;
            if (studentData.dakhelaNumber !== undefined) updateData.dakhelaNumber = studentData.dakhelaNumber;
            if (studentData.dob !== undefined) updateData.dob = studentData.dob ? new Date(studentData.dob) : null;
            if (studentData.birthRegistration !== undefined) updateData.birthRegistration = studentData.birthRegistration;
            if (studentData.gender !== undefined) updateData.gender = studentData.gender;
            if (studentData.mobile !== undefined) updateData.mobile = studentData.mobile;
            if (studentData.bloodGroup !== undefined) updateData.bloodGroup = studentData.bloodGroup;
            if (studentData.attachmentType !== undefined) updateData.attachmentType = studentData.attachmentType;

            // Family Information
            if (studentData.fatherName !== undefined) updateData.fatherName = studentData.fatherName;
            if (studentData.motherName !== undefined) updateData.motherName = studentData.motherName;
            if (studentData.guardianName !== undefined) updateData.guardianName = studentData.guardianName;
            if (studentData.guardianMobile !== undefined) updateData.guardianMobile = studentData.guardianMobile;
            if (studentData.relation !== undefined) updateData.relation = studentData.relation;
            if (studentData.guardianNid !== undefined) updateData.guardianNid = studentData.guardianNid;

            // Address Information
            if (studentData.permanentVillage !== undefined) updateData.permanentVillage = studentData.permanentVillage;
            if (studentData.permanentPostOffice !== undefined) updateData.permanentPostOffice = studentData.permanentPostOffice;
            if (studentData.permanentDistrict !== undefined) updateData.permanentDistrict = studentData.permanentDistrict;
            if (studentData.permanentThana !== undefined) updateData.permanentThana = studentData.permanentThana;
            if (studentData.currentVillage !== undefined) updateData.currentVillage = studentData.currentVillage;
            if (studentData.currentPostOffice !== undefined) updateData.currentPostOffice = studentData.currentPostOffice;
            if (studentData.currentDistrict !== undefined) updateData.currentDistrict = studentData.currentDistrict;
            if (studentData.currentThana !== undefined) updateData.currentThana = studentData.currentThana;
            if (studentData.sameAsPermanent !== undefined) updateData.sameAsPermanent = parseBoolean(studentData.sameAsPermanent);

            // Academic Information
            if (studentData.classId) updateData.classId = new ObjectId(studentData.classId);
            if (studentData.batchId) updateData.batchId = studentData.batchId ? new ObjectId(studentData.batchId) : null;
            if (studentData.sectionId) updateData.sectionId = studentData.sectionId ? new ObjectId(studentData.sectionId) : null;
            if (studentData.sessionId) updateData.sessionId = studentData.sessionId ? new ObjectId(studentData.sessionId) : null;
            if (studentData.mentorId) updateData.mentorId = studentData.mentorId ? new ObjectId(studentData.mentorId) : null;
            if (studentData.classRoll !== undefined) updateData.classRoll = parseIntSafe(studentData.classRoll);
            if (studentData.additionalNote !== undefined) updateData.additionalNote = studentData.additionalNote;
            if (studentData.status !== undefined) updateData.status = studentData.status;
            if (studentData.studentType !== undefined) updateData.studentType = studentData.studentType;

            // Fee Information
            if (studentData.admissionFee !== undefined) updateData.admissionFee = parseFloatSafe(studentData.admissionFee);
            if (studentData.monthlyFee !== undefined) updateData.monthlyFee = parseFloatSafe(studentData.monthlyFee);
            if (studentData.previousDues !== undefined) updateData.previousDues = parseFloatSafe(studentData.previousDues);
            if (studentData.sessionFee !== undefined) updateData.sessionFee = parseFloatSafe(studentData.sessionFee);
            if (studentData.boardingFee !== undefined) updateData.boardingFee = parseFloatSafe(studentData.boardingFee);
            if (studentData.otherFee !== undefined) updateData.otherFee = parseFloatSafe(studentData.otherFee);
            if (studentData.transportFee !== undefined) updateData.transportFee = parseFloatSafe(studentData.transportFee);
            if (studentData.residenceFee !== undefined) updateData.residenceFee = parseFloatSafe(studentData.residenceFee);

            // Other Settings
            if (studentData.sendAdmissionSMS !== undefined) updateData.sendAdmissionSMS = parseBoolean(studentData.sendAdmissionSMS);
            if (studentData.studentSerial !== undefined) updateData.studentSerial = parseIntSafe(studentData.studentSerial);
            if (studentData.sendAttendanceSMS !== undefined) updateData.sendAttendanceSMS = parseBoolean(studentData.sendAttendanceSMS);

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
            const admissionFee = updateData.admissionFee !== undefined ? updateData.admissionFee : existingStudent.admissionFee;
            const monthlyFee = updateData.monthlyFee !== undefined ? updateData.monthlyFee : existingStudent.monthlyFee;
            const previousDues = updateData.previousDues !== undefined ? updateData.previousDues : existingStudent.previousDues;
            const sessionFee = updateData.sessionFee !== undefined ? updateData.sessionFee : existingStudent.sessionFee;
            const boardingFee = updateData.boardingFee !== undefined ? updateData.boardingFee : existingStudent.boardingFee;
            const otherFee = updateData.otherFee !== undefined ? updateData.otherFee : existingStudent.otherFee;
            const transportFee = updateData.transportFee !== undefined ? updateData.transportFee : existingStudent.transportFee;
            const residenceFee = updateData.residenceFee !== undefined ? updateData.residenceFee : existingStudent.residenceFee;

            updateData.totalFees = 
                admissionFee +
                monthlyFee +
                previousDues +
                sessionFee +
                boardingFee +
                otherFee +
                transportFee +
                residenceFee;

            updateData.dueFees = updateData.totalFees - (existingStudent.paidFees || 0);

            const result = await studentsCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            res.json({
                success: true,
                message: 'Student updated successfully',
                data: {
                    _id: id,
                    ...updateData
                }
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