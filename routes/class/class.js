const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (classCollection) => {

    // Get all classes with student count
    router.get('/', async (req, res) => {
        try {
            const classes = await classCollection.find({}).toArray();
            
            // Add student count to each class (you might need to adjust this based on your student collection)
            const classesWithCount = await Promise.all(
                classes.map(async (classItem) => {
                    // If you have a student collection, you can count students in this class
                    // const studentCount = await studentCollection.countDocuments({ classId: classItem._id });
                    // For now, using a placeholder or you can remove this if not needed
                    const studentCount = 0; // Replace with actual count logic
                    
                    return {
                        ...classItem,
                        studentCount
                    };
                })
            );

            res.status(200).json({
                success: true,
                message: 'Classes fetched successfully',
                data: classesWithCount
            });
        } catch (error) {
            console.error('Error fetching classes:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch classes',
                error: error.message
            });
        }
    });

    // Create new class
    router.post('/', async (req, res) => {
        try {
            const { name, description } = req.body;

            // Validation
            if (!name || name.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Class name is required'
                });
            }

            if (name.trim().length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'Class name must be at least 2 characters long'
                });
            }

            // Check if class name already exists
            const existingClass = await classCollection.findOne({ 
                name: name.trim() 
            });

            if (existingClass) {
                return res.status(400).json({
                    success: false,
                    message: 'Class name already exists'
                });
            }

            const newClass = {
                name: name.trim(),
                description: description ? description.trim() : '',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await classCollection.insertOne(newClass);

            res.status(201).json({
                success: true,
                message: 'Class created successfully',
                data: {
                    _id: result.insertedId,
                    ...newClass
                }
            });
        } catch (error) {
            console.error('Error creating class:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create class',
                error: error.message
            });
        }
    });

    // Update class
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { name, description } = req.body;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid class ID'
                });
            }

            // Validation
            if (!name || name.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Class name is required'
                });
            }

            if (name.trim().length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'Class name must be at least 2 characters long'
                });
            }

            // Check if class exists
            const existingClass = await classCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingClass) {
                return res.status(404).json({
                    success: false,
                    message: 'Class not found'
                });
            }

            // Check if class name already exists (excluding current class)
            const duplicateClass = await classCollection.findOne({ 
                name: name.trim(),
                _id: { $ne: new ObjectId(id) }
            });

            if (duplicateClass) {
                return res.status(400).json({
                    success: false,
                    message: 'Class name already exists'
                });
            }

            const updatedClass = {
                name: name.trim(),
                description: description ? description.trim() : '',
                updatedAt: new Date()
            };

            const result = await classCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedClass }
            );

            if (result.modifiedCount === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No changes made to the class'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Class updated successfully',
                data: {
                    _id: id,
                    ...updatedClass,
                    isActive: existingClass.isActive,
                    createdAt: existingClass.createdAt
                }
            });
        } catch (error) {
            console.error('Error updating class:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update class',
                error: error.message
            });
        }
    });

    // Delete class
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid class ID'
                });
            }

            // Check if class exists
            const existingClass = await classCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingClass) {
                return res.status(404).json({
                    success: false,
                    message: 'Class not found'
                });
            }

            // Check if class has students (you might want to add this check)
            // const studentCount = await studentCollection.countDocuments({ classId: new ObjectId(id) });
            // if (studentCount > 0) {
            //     return res.status(400).json({
            //         success: false,
            //         message: 'Cannot delete class with students. Please remove students first.'
            //     });
            // }

            const result = await classCollection.deleteOne({ 
                _id: new ObjectId(id) 
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Class not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Class deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting class:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete class',
                error: error.message
            });
        }
    });

    // Toggle class status
    router.patch('/:id/toggle-status', async (req, res) => {
        try {
            const { id } = req.params;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid class ID'
                });
            }

            // Check if class exists
            const existingClass = await classCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingClass) {
                return res.status(404).json({
                    success: false,
                    message: 'Class not found'
                });
            }

            const newStatus = !existingClass.isActive;

            const result = await classCollection.updateOne(
                { _id: new ObjectId(id) },
                { 
                    $set: { 
                        isActive: newStatus,
                        updatedAt: new Date()
                    } 
                }
            );

            if (result.modifiedCount === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Failed to update class status'
                });
            }

            res.status(200).json({
                success: true,
                message: `Class ${newStatus ? 'activated' : 'deactivated'} successfully`,
                data: {
                    isActive: newStatus
                }
            });
        } catch (error) {
            console.error('Error toggling class status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to toggle class status',
                error: error.message
            });
        }
    });

    // Get single class by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid class ID'
                });
            }

            const classItem = await classCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!classItem) {
                return res.status(404).json({
                    success: false,
                    message: 'Class not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Class fetched successfully',
                data: classItem
            });
        } catch (error) {
            console.error('Error fetching class:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch class',
                error: error.message
            });
        }
    });

    return router;
};