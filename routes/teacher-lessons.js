const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ObjectId } = require('mongodb');

// Multer configuration for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/teacher-lessons/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.ppt', '.pptx'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, PPT, PPTX files are allowed.'));
    }
  }
});

module.exports = (teacherLessonsCollection, teachersCollection, classesCollection) => {

  // Get all teacher lessons
  router.get('/', async (req, res) => {
    try {
      const lessons = await teacherLessonsCollection.aggregate([
        {
          $lookup: {
            from: 'teachers',
            localField: 'teacherId',
            foreignField: '_id',
            as: 'teacher'
          }
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
          $unwind: {
            path: '$teacher',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $unwind: {
            path: '$class',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            title: 1,
            description: 1,
            fileName: 1,
            filePath: 1,
            fileSize: 1,
            downloads: 1,
            isActive: 1,
            createdAt: 1,
            updatedAt: 1,
            'teacher.name': 1,
            'teacher._id': 1,
            'class.name': 1,
            'class._id': 1
          }
        },
        {
          $sort: { createdAt: -1 }
        }
      ]).toArray();

      res.json({
        success: true,
        data: lessons,
        message: 'Teacher lessons fetched successfully'
      });
    } catch (error) {
      console.error('Error fetching teacher lessons:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching teacher lessons',
        error: error.message
      });
    }
  });

  // Create new teacher lesson
  router.post('/', upload.single('lessonFile'), async (req, res) => {
    try {
      const { title, description, teacherId, classId } = req.body;

      if (!title || !teacherId || !classId) {
        return res.status(400).json({
          success: false,
          message: 'Title, teacher, and class are required'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Lesson plan file is required'
        });
      }

      const lessonData = {
        title,
        description: description || '',
        teacherId: new ObjectId(teacherId),
        classId: new ObjectId(classId),
        fileName: req.file.originalname,
        filePath: `/uploads/teacher-lessons/${req.file.filename}`,
        fileSize: req.file.size,
        downloads: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await teacherLessonsCollection.insertOne(lessonData);

      res.json({
        success: true,
        data: { _id: result.insertedId, ...lessonData },
        message: 'Lesson plan created successfully'
      });
    } catch (error) {
      console.error('Error creating lesson plan:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating lesson plan',
        error: error.message
      });
    }
  });

  // Update teacher lesson
  router.put('/:id', upload.single('lessonFile'), async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, teacherId, classId } = req.body;

      const updateData = {
        title,
        description: description || '',
        teacherId: new ObjectId(teacherId),
        classId: new ObjectId(classId),
        updatedAt: new Date()
      };

      // If new file is uploaded
      if (req.file) {
        updateData.fileName = req.file.originalname;
        updateData.filePath = `/uploads/teacher-lessons/${req.file.filename}`;
        updateData.fileSize = req.file.size;
      }

      const result = await teacherLessonsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Lesson plan not found'
        });
      }

      res.json({
        success: true,
        message: 'Lesson plan updated successfully'
      });
    } catch (error) {
      console.error('Error updating lesson plan:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating lesson plan',
        error: error.message
      });
    }
  });

  // Delete teacher lesson
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const result = await teacherLessonsCollection.deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Lesson plan not found'
        });
      }

      res.json({
        success: true,
        message: 'Lesson plan deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting lesson plan:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting lesson plan',
        error: error.message
      });
    }
  });

  // Download lesson plan
  router.patch('/:id/download', async (req, res) => {
    try {
      const { id } = req.params;

      const result = await teacherLessonsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $inc: { downloads: 1 } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Lesson plan not found'
        });
      }

      res.json({
        success: true,
        message: 'Download count updated'
      });
    } catch (error) {
      console.error('Error updating download count:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating download count',
        error: error.message
      });
    }
  });

  return router;
};