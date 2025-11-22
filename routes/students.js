const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const upload = require('../middleware/upload'); // তুমি যেটা banners এ ব্যবহার করেছ
const path = require('path');
const fs = require('fs');

// ========================
// STUDENT ROUTES (Full CRUD)
// ========================
module.exports = (studentsCollection) => {

  // GET all students (with optional search)
  router.get('/', async (req, res) => {
    try {
      const { search, page = 1, limit = 20 } = req.query;
      let query = {};

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { studentId: { $regex: search, $options: 'i' } },
          { mobile: { $regex: search, $options: 'i' } }
        ];
      }

      const students = await studentsCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .toArray();

      const total = await studentsCollection.countDocuments(query);

      res.json({
        success: true,
        data: students,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'শিক্ষার্থীদের তালিকা লোড করতে সমস্যা হয়েছে',
        error: error.message
      });
    }
  });

// CREATE new student
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const data = req.body;

    // Required field validation
    const required = ['name', 'birthDate', 'gender', 'fatherName', 'motherName', 'classRoll'];
    for (let field of required) {
      if (!data[field]) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          message: `${field} আবশ্যক`
        });
      }
    }

    // Smart ID Card ডুপ্লিকেট চেক (যদি দেওয়া থাকে)
    if (data.smartIdCard && data.smartIdCard.trim() !== '') {
      const existingStudent = await studentsCollection.findOne({
        smartIdCard: data.smartIdCard.trim()
      });

      if (existingStudent) {
        if (req.file) fs.unlinkSync(req.file.path); // ফাইল মুছে ফেলো
        return res.status(400).json({
          success: false,
          message: `এই Smart ID Card (${data.smartIdCard}) ইতিমধ্যে ব্যবহৃত হয়েছে!`,
          usedBy: existingStudent.name
        });
      }
    }

    // Student ID ডুপ্লিকেট চেক (যদিও ps-xxxx র‍্যান্ডম, তবু নিরাপত্তা)
    if (data.studentId) {
      const existingByStudentId = await studentsCollection.findOne({
        studentId: data.studentId
      });
      if (existingByStudentId) {
        data.studentId = `ps-${Date.now().toString().slice(-6)}`; // নতুন জেনারেট করো
      }
    }

    const studentData = {
      ...data,
      studentId: data.studentId || `ps-${Date.now().toString().slice(-6)}`,
      photo: req.file ? `/api/uploads/${req.file.filename}` : null,
      photoOriginalName: req.file?.originalname || null,
      photoSize: req.file?.size || null,
      photoMimeType: req.file?.mimetype || null,

      // Parse numeric fields
      admissionFee: parseFloat(data.admissionFee) || 0,
      monthlyFee: parseFloat(data.monthlyFee) || 0,
      previousDues: parseFloat(data.previousDues) || 0,
      sessionFee: parseFloat(data.sessionFee) || 0,
      boardingFee: parseFloat(data.boardingFee) || 0,
      otherFee: parseFloat(data.otherFee) || 0,
      transportFee: parseFloat(data.transportFee) || 0,
      residenceFee: parseFloat(data.residenceFee) || 0,

      // Boolean fields
      sendAdmissionSMS: data.sendAdmissionSMS === 'true' || data.sendAdmissionSMS === true,
      sendAttendanceSMS: data.sendAttendanceSMS === 'true' || data.sendAttendanceSMS === false,

      position: data.position || 'Active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await studentsCollection.insertOne(studentData);

    res.status(201).json({
      success: true,
      message: 'শিক্ষার্থী সফলভাবে যোগ করা হয়েছে',
      data: {
        _id: result.insertedId,
        ...studentData
      }
    });

  } catch (error) {
    // MongoDB duplicate key error (E11000) ধরার জন্য
    if (error.code === 11000) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'এই Smart ID Card ইতিমধ্যে ব্যবহৃত হয়েছে!',
        error: 'Duplicate Smart ID Card'
      });
    }

    // অনেক সময় error.message এ "smartIdCard" থাকে
    if (error.message && error.message.includes('smartIdCard')) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'এই Smart ID Card ইতিমধ্যে ব্যবহৃত হয়েছে!'
      });
    }

    // অন্য সব এরর
    if (req.file) {
      const filePath = req.file.path;
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    console.error('Student create error:', error);
    res.status(500).json({
      success: false,
      message: 'শিক্ষার্থী যোগ করতে সমস্যা হয়েছে',
      error: error.message
    });
  }
});

  // UPDATE student
  router.put('/:id', upload.single('photo'), async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'অবৈধ আইডি' });
      }

      const data = req.body;
      const oldStudent = await studentsCollection.findOne({ _id: new ObjectId(id) });

      if (!oldStudent) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(404).json({ success: false, message: 'শিক্ষার্থী পাওয়া যায়নি' });
      }

      // Delete old photo if new one uploaded
      if (req.file && oldStudent.photo) {
        const oldPath = path.join(__dirname, '..', 'uploads', oldStudent.photo.split('/').pop());
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      const updatedData = {
        ...data,
        photo: req.file ? `/api/uploads/${req.file.filename}` : oldStudent.photo,
        photoOriginalName: req.file?.originalname || oldStudent.photoOriginalName,
        photoSize: req.file?.size || oldStudent.photoSize,
        photoMimeType: req.file?.mimetype || oldStudent.photoMimeType,

        // Parse numbers again
        admissionFee: parseFloat(data.admissionFee) || 0,
        monthlyFee: parseFloat(data.monthlyFee) || 0,
        previousDues: parseFloat(data.previousDues) || 0,
        sessionFee: parseFloat(data.sessionFee) || 0,
        boardingFee: parseFloat(data.boardingFee) || 0,
        otherFee: parseFloat(data.otherFee) || 0,
        transportFee: parseFloat(data.transportFee) || 0,
        residenceFee: parseFloat(data.residenceFee) || 0,

        sendAdmissionSMS: data.sendAdmissionSMS === 'true',
        sendAttendanceSMS: data.sendAttendanceSMS === 'true',
        position: data.position || oldStudent.position,

        updatedAt: new Date()
      };

      await studentsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );

      res.json({
        success: true,
        message: 'শিক্ষার্থীর তথ্য আপডেট করা হয়েছে',
        data: { _id: id, ...updatedData }
      });

    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({
        success: false,
        message: 'আপডেট করতে সমস্যা হয়েছে',
        error: error.message
      });
    }
  });

  // DELETE student
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'অবৈধ আইডি' });
      }

      const student = await studentsCollection.findOne({ _id: new ObjectId(id) });
      if (!student) {
        return res.status(404).json({ success: false, message: 'শিক্ষার্থী পাওয়া যায়নি' });
      }

      // Delete photo file
      if (student.photo) {
        const filename = student.photo.split('/').pop();
        const filePath = path.join(__dirname, '..', 'uploads', filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      await studentsCollection.deleteOne({ _id: new ObjectId(id) });

      res.json({
        success: true,
        message: 'শিক্ষার্থী সফলভাবে মুছে ফেলা হয়েছে'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'ডিলিট করতে সমস্যা হয়েছে',
        error: error.message
      });
    }
  });

  // GET single student by ID
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'অবৈধ আইডি' });
      }

      const student = await studentsCollection.findOne({ _id: new ObjectId(id) });
      if (!student) {
        return res.status(404).json({ success: false, message: 'শিক্ষার্থী পাওয়া যায়নি' });
      }

      res.json({
        success: true,
        data: student
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'শিক্ষার্থীর তথ্য লোড করতে সমস্যা',
        error: error.message
      });
    }
  });

  return router;
};