const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (classTeacherCollection) => {

    // Get all class teachers
    router.get('/', async (req, res) => {
        try {
            const classTeachers = await classTeacherCollection.find({}).toArray();
            
            res.status(200).json({
                success: true,
                message: 'Class teachers fetched successfully',
                data: classTeachers
            });
        } catch (error) {
            console.error('Error fetching class teachers:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch class teachers',
                error: error.message
            });
        }
    });

    // Create new class teacher assignment
    router.post('/', async (req, res) => {
        try {
            const { teacherName, className, subjectName } = req.body;

            // Validation
            if (!teacherName || teacherName.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Teacher name is required'
                });
            }

            if (!className || className.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Class name is required'
                });
            }

            if (!subjectName || subjectName.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Subject name is required'
                });
            }

            // Check if this teacher is already assigned to this class and subject
            const existingAssignment = await classTeacherCollection.findOne({
                teacherName: teacherName.trim(),
                className: className.trim(),
                subjectName: subjectName.trim()
            });

            if (existingAssignment) {
                return res.status(400).json({
                    success: false,
                    message: 'This teacher is already assigned to this class and subject'
                });
            }

            const newClassTeacher = {
                teacherName: teacherName.trim(),
                className: className.trim(),
                subjectName: subjectName.trim(),
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await classTeacherCollection.insertOne(newClassTeacher);

            res.status(201).json({
                success: true,
                message: 'Class teacher assigned successfully',
                data: {
                    _id: result.insertedId,
                    ...newClassTeacher
                }
            });
        } catch (error) {
            console.error('Error creating class teacher:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to assign class teacher',
                error: error.message
            });
        }
    });

    // Update class teacher assignment
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { teacherName, className, subjectName } = req.body;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid class teacher ID'
                });
            }

            // Validation
            if (!teacherName || teacherName.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Teacher name is required'
                });
            }

            if (!className || className.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Class name is required'
                });
            }

            if (!subjectName || subjectName.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Subject name is required'
                });
            }

            // Check if class teacher exists
            const existingClassTeacher = await classTeacherCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingClassTeacher) {
                return res.status(404).json({
                    success: false,
                    message: 'Class teacher assignment not found'
                });
            }

            // Check if this assignment already exists (for other records)
            const duplicateAssignment = await classTeacherCollection.findOne({
                teacherName: teacherName.trim(),
                className: className.trim(),
                subjectName: subjectName.trim(),
                _id: { $ne: new ObjectId(id) }
            });

            if (duplicateAssignment) {
                return res.status(400).json({
                    success: false,
                    message: 'This teacher-class-subject assignment already exists'
                });
            }

            const updatedClassTeacher = {
                teacherName: teacherName.trim(),
                className: className.trim(),
                subjectName: subjectName.trim(),
                updatedAt: new Date()
            };

            const result = await classTeacherCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedClassTeacher }
            );

            if (result.modifiedCount === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No changes made to the class teacher assignment'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Class teacher assignment updated successfully',
                data: {
                    _id: id,
                    ...updatedClassTeacher,
                    isActive: existingClassTeacher.isActive,
                    createdAt: existingClassTeacher.createdAt
                }
            });
        } catch (error) {
            console.error('Error updating class teacher:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update class teacher assignment',
                error: error.message
            });
        }
    });

    // Delete class teacher assignment
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid class teacher ID'
                });
            }

            // Check if class teacher exists
            const existingClassTeacher = await classTeacherCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingClassTeacher) {
                return res.status(404).json({
                    success: false,
                    message: 'Class teacher assignment not found'
                });
            }

            const result = await classTeacherCollection.deleteOne({ 
                _id: new ObjectId(id) 
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Class teacher assignment not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Class teacher assignment deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting class teacher:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete class teacher assignment',
                error: error.message
            });
        }
    });

    // Toggle class teacher status
    router.patch('/:id/toggle-status', async (req, res) => {
        try {
            const { id } = req.params;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid class teacher ID'
                });
            }

            // Check if class teacher exists
            const existingClassTeacher = await classTeacherCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingClassTeacher) {
                return res.status(404).json({
                    success: false,
                    message: 'Class teacher assignment not found'
                });
            }

            const newStatus = !existingClassTeacher.isActive;

            const result = await classTeacherCollection.updateOne(
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
                    message: 'Failed to update class teacher status'
                });
            }

            res.status(200).json({
                success: true,
                message: `Class teacher ${newStatus ? 'activated' : 'deactivated'} successfully`,
                data: {
                    isActive: newStatus
                }
            });
        } catch (error) {
            console.error('Error toggling class teacher status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to toggle class teacher status',
                error: error.message
            });
        }
    });

    return router;
};