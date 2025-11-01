const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload'); // Your existing upload middleware
const { ObjectId } = require('mongodb');

module.exports = (noticeCollection) => {

  // Get all notices
  router.get('/', async (req, res) => {
    try {
      const notices = await noticeCollection.find().sort({ createdAt: -1 }).toArray();
      res.json({
        success: true,
        data: notices
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching notices',
        error: error.message
      });
    }
  });

  // Get single notice by ID
  router.get('/:id', async (req, res) => {
    try {
      const notice = await noticeCollection.findOne({ _id: new ObjectId(req.params.id) });
      if (!notice) {
        return res.status(404).json({
          success: false,
          message: 'Notice not found'
        });
      }
      res.json({
        success: true,
        data: notice
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching notice',
        error: error.message
      });
    }
  });

  // Create new notice
  router.post('/', upload.single('attachment'), async (req, res) => {
    try {
      const { title, body, isPublished } = req.body;
      
      // Validate required fields
      if (!title || !body) {
        return res.status(400).json({
          success: false,
          message: 'Title and body are required fields'
        });
      }
      
      const noticeData = {
        title,
        body,
        isPublished: isPublished === 'true',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Add attachment if uploaded
      if (req.file) {
        noticeData.attachment = {
          filename: req.file.filename,
          originalName: req.file.originalname,
          path: req.file.path,
          mimetype: req.file.mimetype,
          size: req.file.size
        };
      }

      const result = await noticeCollection.insertOne(noticeData);
      
      res.status(201).json({
        success: true,
        message: 'Notice created successfully',
        data: {
          _id: result.insertedId,
          ...noticeData
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating notice',
        error: error.message
      });
    }
  });

  // Update notice
  router.put('/:id', upload.single('attachment'), async (req, res) => {
    try {
      const { title, body, isPublished } = req.body;
      
      const updateData = {
        title,
        body,
        isPublished: isPublished === 'true',
        updatedAt: new Date()
      };

      // Add attachment if new file uploaded
      if (req.file) {
        updateData.attachment = {
          filename: req.file.filename,
          originalName: req.file.originalname,
          path: req.file.path,
          mimetype: req.file.mimetype,
          size: req.file.size
        };
      }

      const result = await noticeCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Notice not found'
        });
      }

      res.json({
        success: true,
        message: 'Notice updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating notice',
        error: error.message
      });
    }
  });

  // Delete notice
  router.delete('/:id', async (req, res) => {
    try {
      const result = await noticeCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Notice not found'
        });
      }

      res.json({
        success: true,
        message: 'Notice deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting notice',
        error: error.message
      });
    }
  });

  // Toggle publish status
  router.patch('/:id/toggle-publish', async (req, res) => {
    try {
      const notice = await noticeCollection.findOne({ _id: new ObjectId(req.params.id) });
      if (!notice) {
        return res.status(404).json({
          success: false,
          message: 'Notice not found'
        });
      }

      const result = await noticeCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { isPublished: !notice.isPublished, updatedAt: new Date() } }
      );

      res.json({
        success: true,
        message: `Notice ${!notice.isPublished ? 'published' : 'unpublished'} successfully`,
        isPublished: !notice.isPublished
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error toggling publish status',
        error: error.message
      });
    }
  });

  return router;
};