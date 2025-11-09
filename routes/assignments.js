const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ObjectId } = require('mongodb');

// Multer configuration for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/assignments/';
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
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.gif'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, JPG, JPEG, PNG, GIF files are allowed.'));
    }
  }
});

module.exports = (assignmentsCollection, classesCollection, teachersCollection) => {

  // Get all assignments
  router.get('/', async (req, res) => {
    try {
      const assignments = await assignmentsCollection.aggregate([
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
            from: 'teachers',
            localField: 'teacherId',
            foreignField: '_id',
            as: 'teacher'
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
          $unwind: {
            path: '$class',
            preserveNullAndEmptyArrays: true
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
            path: '$section',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            title: 1,
            classId: 1,
            teacherId: 1,
            sectionId: 1,
            homeworkDate: 1,
            status: 1,
            attachments: 1,
            homeworkDetails: 1,
            createdAt: 1,
            updatedAt: 1,
            'class.name': 1,
            'teacher.name': 1,
            'section.name': 1
          }
        },
        {
          $sort: { createdAt: -1 }
        }
      ]).toArray();

      res.json({
        success: true,
        data: assignments,
        message: 'Assignments fetched successfully'
      });
    } catch (error) {
      console.error('Error fetching assignments:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching assignments',
        error: error.message
      });
    }
  });

  // Create new assignment
  router.post('/', upload.array('attachments', 5), async (req, res) => {
    try {
      const { 
        title, 
        classId, 
        teacherId, 
        sectionId, 
        homeworkDate, 
        status,
        homeworkDetails 
      } = req.body;

      if (!title || !classId || !teacherId || !homeworkDate) {
        return res.status(400).json({
          success: false,
          message: 'Title, class, teacher, and homework date are required'
        });
      }

      // Parse homeworkDetails if it's a string
      let homeworkDetailsArray = [];
      if (homeworkDetails) {
        homeworkDetailsArray = typeof homeworkDetails === 'string' 
          ? JSON.parse(homeworkDetails) 
          : homeworkDetails;
      }

      const assignmentData = {
        title,
        classId: new ObjectId(classId),
        teacherId: new ObjectId(teacherId),
        sectionId: sectionId ? new ObjectId(sectionId) : null,
        homeworkDate: new Date(homeworkDate),
        status: status || 'draft',
        homeworkDetails: homeworkDetailsArray,
        attachments: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Process uploaded files
      if (req.files && req.files.length > 0) {
        assignmentData.attachments = req.files.map(file => ({
          fileName: file.originalname,
          filePath: `/uploads/assignments/${file.filename}`,
          fileSize: file.size,
          fileType: file.mimetype
        }));
      }

      const result = await assignmentsCollection.insertOne(assignmentData);

      res.json({
        success: true,
        data: { _id: result.insertedId, ...assignmentData },
        message: 'Assignment created successfully'
      });
    } catch (error) {
      console.error('Error creating assignment:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating assignment',
        error: error.message
      });
    }
  });

  // Update assignment
  router.put('/:id', upload.array('attachments', 5), async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        title, 
        classId, 
        teacherId, 
        sectionId, 
        homeworkDate, 
        status,
        homeworkDetails 
      } = req.body;

      const updateData = {
        title,
        classId: new ObjectId(classId),
        teacherId: new ObjectId(teacherId),
        sectionId: sectionId ? new ObjectId(sectionId) : null,
        homeworkDate: new Date(homeworkDate),
        status: status || 'draft',
        updatedAt: new Date()
      };

      // Parse homeworkDetails if it's a string
      if (homeworkDetails) {
        updateData.homeworkDetails = typeof homeworkDetails === 'string' 
          ? JSON.parse(homeworkDetails) 
          : homeworkDetails;
      }

      // Process new uploaded files
      if (req.files && req.files.length > 0) {
        const newAttachments = req.files.map(file => ({
          fileName: file.originalname,
          filePath: `/uploads/assignments/${file.filename}`,
          fileSize: file.size,
          fileType: file.mimetype
        }));
        
        // Replace all attachments with new ones
        updateData.attachments = newAttachments;
      }

      const result = await assignmentsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Assignment not found'
        });
      }

      res.json({
        success: true,
        message: 'Assignment updated successfully'
      });
    } catch (error) {
      console.error('Error updating assignment:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating assignment',
        error: error.message
      });
    }
  });

  // Delete assignment
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const result = await assignmentsCollection.deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Assignment not found'
        });
      }

      res.json({
        success: true,
        message: 'Assignment deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting assignment:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting assignment',
        error: error.message
      });
    }
  });

  return router;
};