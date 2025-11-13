const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (examGroupCollection) => {

    // Get all exam groups
    router.get('/', async (req, res) => {
        try {
            const examGroups = await examGroupCollection.find({ 
                isActive: true 
            }).sort({ createdAt: -1 }).toArray();

            res.status(200).json({
                success: true,
                message: 'Exam groups fetched successfully',
                data: examGroups
            });
        } catch (error) {
            console.error('Error fetching exam groups:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch exam groups',
                error: error.message
            });
        }
    });

    // Get exam group by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid exam group ID'
                });
            }

            const examGroup = await examGroupCollection.findOne({ 
                _id: new ObjectId(id),
                isActive: true 
            });

            if (!examGroup) {
                return res.status(404).json({
                    success: false,
                    message: 'Exam group not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Exam group fetched successfully',
                data: examGroup
            });
        } catch (error) {
            console.error('Error fetching exam group:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch exam group',
                error: error.message
            });
        }
    });

    // Create new exam group
    router.post('/', async (req, res) => {
        try {
            const { 
                name, 
                mainExam, 
                subExams = [] 
            } = req.body;

            // Validation
            if (!name || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Exam group name is required'
                });
            }

            if (!mainExam || !mainExam.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Main exam is required'
                });
            }

            // Check if exam group name already exists
            const existingExamGroup = await examGroupCollection.findOne({
                name: name.trim(),
                isActive: true
            });

            if (existingExamGroup) {
                return res.status(400).json({
                    success: false,
                    message: 'Exam group with this name already exists'
                });
            }

            const examGroup = {
                name: name.trim(),
                mainExam: mainExam.trim(),
                subExams: Array.isArray(subExams) ? subExams.filter(sub => sub && sub.trim()) : [],
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await examGroupCollection.insertOne(examGroup);
            const savedExamGroup = { ...examGroup, _id: result.insertedId };

            res.status(201).json({
                success: true,
                message: 'Exam group created successfully',
                data: savedExamGroup
            });
        } catch (error) {
            console.error('Error creating exam group:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create exam group',
                error: error.message
            });
        }
    });

    // Update exam group
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { 
                name, 
                mainExam, 
                subExams = [] 
            } = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid exam group ID'
                });
            }

            // Validation
            if (!name || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Exam group name is required'
                });
            }

            if (!mainExam || !mainExam.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Main exam is required'
                });
            }

            // Check if exam group exists
            const existingExamGroup = await examGroupCollection.findOne({
                _id: new ObjectId(id),
                isActive: true
            });

            if (!existingExamGroup) {
                return res.status(404).json({
                    success: false,
                    message: 'Exam group not found'
                });
            }

            // Check if another exam group with same name exists
            const duplicateExamGroup = await examGroupCollection.findOne({
                name: name.trim(),
                _id: { $ne: new ObjectId(id) },
                isActive: true
            });

            if (duplicateExamGroup) {
                return res.status(400).json({
                    success: false,
                    message: 'Another exam group with this name already exists'
                });
            }

            const updateData = {
                name: name.trim(),
                mainExam: mainExam.trim(),
                subExams: Array.isArray(subExams) ? subExams.filter(sub => sub && sub.trim()) : [],
                updatedAt: new Date()
            };

            const result = await examGroupCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.modifiedCount === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Failed to update exam group'
                });
            }

            const updatedExamGroup = await examGroupCollection.findOne({
                _id: new ObjectId(id)
            });

            res.status(200).json({
                success: true,
                message: 'Exam group updated successfully',
                data: updatedExamGroup
            });
        } catch (error) {
            console.error('Error updating exam group:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update exam group',
                error: error.message
            });
        }
    });

    // Delete exam group (soft delete)
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid exam group ID'
                });
            }

            const existingExamGroup = await examGroupCollection.findOne({
                _id: new ObjectId(id),
                isActive: true
            });

            if (!existingExamGroup) {
                return res.status(404).json({
                    success: false,
                    message: 'Exam group not found'
                });
            }

            const result = await examGroupCollection.updateOne(
                { _id: new ObjectId(id) },
                { 
                    $set: { 
                        isActive: false, 
                        updatedAt: new Date() 
                    } 
                }
            );

            if (result.modifiedCount === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Failed to delete exam group'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Exam group deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting exam group:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete exam group',
                error: error.message
            });
        }
    });

    return router;
};