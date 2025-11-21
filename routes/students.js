const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ObjectId } = require('mongodb');

// Multer configuration for student photo upload
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

    // GET single student by studentId
    router.get('/:studentId', async (req, res) => {
        try {
            const { studentId } = req.params;

            const student = await studentsCollection.aggregate([
                {
                    $match: { studentId: studentId }
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
                    $project: {
                        studentId: 1,
                        smartId: 1,
                        name: 1,
                        classRoll: 1,
                        mobile: 1,
                        fatherName: 1,
                        motherName: 1,
                        photo: 1,
                        status: 1,
                        'class.name': 1,
                        'section.name': 1,
                        'batch.name': 1,
                        'session.name': 1,
                        createdAt: 1
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

// ==================== CREATE STUDENT ====================
  router.post('/', upload.single('photo'), async (req, res) => {
    try {
      const data = req.body;

      // Required validation
      if (!data.name || !data.classId || !data.classRoll || !data.gender || !data.permanentVillage || !data.permanentPostOffice) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: 'Required fields missing!' });
      }

      // Generate Student ID
      const year = new Date().getFullYear().toString().slice(-2);
      const random = Math.floor(1000 + Math.random() * 9000);
      const studentId = `ST${year}${random}`;

      const parseFloatSafe = (v) => (v ? parseFloat(v) || 0 : 0);
      const parseIntSafe = (v) => (v ? parseInt(v) || 0 : 0);
      const parseBool = (v) => v === 'true' || v === true || v === '1';

      const newStudent = {
        studentId,
        smartId: data.smartId || '',
        dakhelaNumber: data.dakhelaNumber || '',
        name: data.name,
        dob: data.dob ? new Date(data.dob) : null,
        birthRegistration: data.birthRegistration || '',
        gender: data.gender,
        mobile: data.mobile || '',
        bloodGroup: data.bloodGroup || '',
        photo: req.file ? `/api/uploads/students/${req.file.filename}` : '',
        attachmentType: data.attachmentType || '',

        // Guardian / Family
        fatherName: data.fatherName || '',
        motherName: data.motherName || '',
        guardianName: data.guardianName || data.fatherName || '',
        guardianMobile: data.guardianMobile || data.mobile || '',
        relation: data.relation || '',
        guardianNid: data.guardianNid || '',

        // Permanent Address
        permanentVillage: data.permanentVillage,
        permanentPostOffice: data.permanentPostOffice,
        permanentDistrict: data.permanentDistrict || '',
        permanentThana: data.permanentThana || '',

        // Current Address (same as permanent if checkbox true)
        sameAsPermanent: parseBool(data.sameAsPermanent),
        currentVillage: parseBool(data.sameAsPermanent) ? data.permanentVillage : (data.currentVillage || ''),
        currentPostOffice: parseBool(data.sameAsPermanent) ? data.permanentPostOffice : (data.currentPostOffice || ''),
        currentDistrict: parseBool(data.sameAsPermanent) ? data.permanentDistrict : (data.currentDistrict || ''),
        currentThana: parseBool(data.sameAsPermanent) ? data.permanentThana : (data.currentThana || ''),

        // Academic
        classId: new ObjectId(data.classId),
        batchId: data.batchId ? new ObjectId(data.batchId) : null,
        sectionId: data.sectionId ? new ObjectId(data.sectionId) : null,
        sessionId: data.sessionId ? new ObjectId(data.sessionId) : null,
        classRoll: parseIntSafe(data.classRoll),
        studentType: data.studentType || 'non_residential',
        mentorId: data.mentorId ? new ObjectId(data.mentorId) : null,
        additionalNote: data.additionalNote || '',
        status: data.status || 'active',

        // Fees
        admissionFee: parseFloatSafe(data.admissionFee),
        monthlyFee: parseFloatSafe(data.monthlyFee),
        previousDues: parseFloatSafe(data.previousDues),
        sessionFee: parseFloatSafe(data.sessionFee),
        boardingFee: parseFloatSafe(data.boardingFee),
        otherFee: parseFloatSafe(data.otherFee),
        transportFee: parseFloatSafe(data.transportFee),
        residenceFee: parseFloatSafe(data.residenceFee),

        // SMS Settings
        sendAdmissionSMS: parseBool(data.sendAdmissionSMS),
        sendAttendanceSMS: parseBool(data.sendAttendanceSMS),
        studentSerial: parseIntSafe(data.studentSerial),

        // Calculated
        totalFees: 0,
        paidFees: 0,
        dueFees: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Total & Due Fees
      newStudent.totalFees = Object.values(newStudent).filter(v => typeof v === 'number' && v > 0 && [
        'admissionFee','monthlyFee','previousDues','sessionFee','boardingFee','otherFee','transportFee','residenceFee'
      ].some(key => newStudent[key] === v)).reduce((a, b) => a + b, 0);

      newStudent.dueFees = newStudent.totalFees;

      const result = await studentsCollection.insertOne(newStudent);

      res.status(201).json({
        success: true,
        message: 'Student created successfully',
        data: { _id: result.insertedId, ...newStudent }
      });

    } catch (err) {
      if (req.file) fs.unlinkSync(req.file.path);
      console.error('Create student error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ==================== UPDATE STUDENT ====================
  router.put('/:id', upload.single('photo'), async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;

      const existing = await studentsCollection.findOne({ _id: new ObjectId(id) });
      if (!existing) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(404).json({ success: false, message: 'Student not found' });
      }

      const parseFloatSafe = (v) => (v ? parseFloat(v) || 0 : 0);
      const parseIntSafe = (v) => (v ? parseInt(v) || 0 : 0);
      const parseBool = (v) => v === 'true' || v === true || v === '1';

      const updateData = { updatedAt: new Date() };

      // Update only sent fields
      const fields = [
        'name','smartId','dakhelaNumber','dob','birthRegistration','gender','mobile','bloodGroup','attachmentType',
        'fatherName','motherName','guardianName','guardianMobile','relation','guardianNid',
        'permanentVillage','permanentPostOffice','permanentDistrict','permanentThana',
        'currentVillage','currentPostOffice','currentDistrict','currentThana',
        'sameAsPermanent','classId','batchId','sectionId','sessionId','classRoll','studentType',
        'mentorId','additionalNote','status',
        'admissionFee','monthlyFee','previousDues','sessionFee','boardingFee','otherFee','transportFee','residenceFee',
        'sendAdmissionSMS','sendAttendanceSMS','studentSerial'
      ];

      fields.forEach(field => {
        if (data[field] !== undefined) {
          if (['classId','batchId','sectionId','sessionId','mentorId'].includes(field) && data[field]) {
            updateData[field] = data[field] ? new ObjectId(data[field]) : null;
          } else if (field === 'dob' && data[field]) {
            updateData.dob = new Date(data[field]);
          } else if (['sameAsPermanent','sendAdmissionSMS','sendAttendanceSMS'].includes(field)) {
            updateData[field] = parseBool(data[field]);
          } else if (['classRoll','studentSerial'].includes(field)) {
            updateData[field] = parseIntSafe(data[field]);
          } else if (field.endsWith('Fee')) {
            updateData[field] = parseFloatSafe(data[field]);
          } else {
            updateData[field] = data[field];
          }
        }
      });

      // Handle sameAsPermanent checkbox
      if (parseBool(data.sameAsPermanent)) {
        updateData.currentVillage = updateData.permanentVillage || existing.permanentVillage;
        updateData.currentPostOffice = updateData.permanentPostOffice || existing.permanentPostOffice;
        updateData.currentDistrict = updateData.permanentDistrict || existing.permanentDistrict;
        updateData.currentThana = updateData.permanentThana || existing.permanentThana;
      }

      // Photo update
      if (req.file) {
        if (existing.photo) {
          const oldPath = path.join(__dirname, '../../uploads/students', path.basename(existing.photo));
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        updateData.photo = `/api/uploads/students/${req.file.filename}`;
      }

      // Recalculate total fees
      const fees = ['admissionFee','monthlyFee','previousDues','sessionFee','boardingFee','otherFee','transportFee','residenceFee'];
      updateData.totalFees = fees.reduce((sum, key) => sum + (updateData[key] ?? existing[key] ?? 0), 0);
      updateData.dueFees = updateData.totalFees - (existing.paidFees || 0);

      await studentsCollection.updateOne({ _id: new ObjectId(id) }, { $set: updateData });

      res.json({ success: true, message: 'Student updated successfully' });

    } catch (err) {
      if (req.file) fs.unlinkSync(req.file.path);
      console.error('Update error:', err);
      res.status(500).json({ success: false, message: err.message });
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

            // Delete photo file if exists - banners.js style
            if (student.photo && student.photo.startsWith('/api/uploads/students/')) {
                const filename = student.photo.replace('/api/uploads/students/', '');
                const photoPath = path.join(__dirname, '..', 'uploads', 'students', filename);
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