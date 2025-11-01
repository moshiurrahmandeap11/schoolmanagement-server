const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { ObjectId } = require('mongodb');

module.exports = (routineCollection) => {

  // Get all routines
  router.get('/', async (req, res) => {
    try {
      const routines = await routineCollection.find().sort({ createdAt: -1 }).toArray();
      res.json({
        success: true,
        data: routines
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching routines',
        error: error.message
      });
    }
  });

  // Get single routine by ID
  router.get('/:id', async (req, res) => {
    try {
      const routine = await routineCollection.findOne({ _id: new ObjectId(req.params.id) });
      if (!routine) {
        return res.status(404).json({
          success: false,
          message: 'Routine not found'
        });
      }
      res.json({
        success: true,
        data: routine
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching routine',
        error: error.message
      });
    }
  });

  // Create new routine
  router.post('/', upload.single('attachment'), async (req, res) => {
    try {
      const { title, isPublished } = req.body;
      
      // Validate required fields
      if (!title) {
        return res.status(400).json({
          success: false,
          message: 'Title is required'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Attachment is required'
        });
      }
      
      const routineData = {
        title,
        isPublished: isPublished === 'true',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Add attachment
      routineData.attachment = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size
      };

      const result = await routineCollection.insertOne(routineData);
      
      res.status(201).json({
        success: true,
        message: 'Routine created successfully',
        data: {
          _id: result.insertedId,
          ...routineData
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating routine',
        error: error.message
      });
    }
  });

  // Update routine
  router.put('/:id', upload.single('attachment'), async (req, res) => {
    try {
      const { title, isPublished } = req.body;
      
      const updateData = {
        title,
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

      const result = await routineCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Routine not found'
        });
      }

      res.json({
        success: true,
        message: 'Routine updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating routine',
        error: error.message
      });
    }
  });

  // Delete routine
  router.delete('/:id', async (req, res) => {
    try {
      const result = await routineCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Routine not found'
        });
      }

      res.json({
        success: true,
        message: 'Routine deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting routine',
        error: error.message
      });
    }
  });

  // Toggle publish status
  router.patch('/:id/toggle-publish', async (req, res) => {
    try {
      const routine = await routineCollection.findOne({ _id: new ObjectId(req.params.id) });
      if (!routine) {
        return res.status(404).json({
          success: false,
          message: 'Routine not found'
        });
      }

      const result = await routineCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { isPublished: !routine.isPublished, updatedAt: new Date() } }
      );

      res.json({
        success: true,
        message: `Routine ${!routine.isPublished ? 'published' : 'unpublished'} successfully`,
        isPublished: !routine.isPublished
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