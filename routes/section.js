const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (sectionCollection) => {

    // Get all sections with class information
    router.get('/', async (req, res) => {
        try {
            const sections = await sectionCollection.aggregate([
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
                        path: '$class',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        name: 1,
                        classId: 1,
                        isActive: 1,
                        createdAt: 1,
                        updatedAt: 1,
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
                data: sections,
                message: 'Sections fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching sections:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching sections',
                error: error.message
            });
        }
    });

    // Create new section
    router.post('/', async (req, res) => {
        try {
            const { name, classId } = req.body;

            if (!name || !classId) {
                return res.status(400).json({
                    success: false,
                    message: 'Section name and class are required'
                });
            }

            // Check if section already exists for this class
            const existingSection = await sectionCollection.findOne({
                name: name.trim(),
                classId: new ObjectId(classId)
            });

            if (existingSection) {
                return res.status(400).json({
                    success: false,
                    message: 'এই ক্লাসে এই নামের সেকশন ইতিমধ্যে存在 করে'
                });
            }

            const sectionData = {
                name: name.trim(),
                classId: new ObjectId(classId),
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await sectionCollection.insertOne(sectionData);

            res.json({
                success: true,
                data: { _id: result.insertedId, ...sectionData },
                message: 'Section created successfully'
            });
        } catch (error) {
            console.error('Error creating section:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating section',
                error: error.message
            });
        }
    });

    // Update section
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { name, classId } = req.body;

            if (!name || !classId) {
                return res.status(400).json({
                    success: false,
                    message: 'Section name and class are required'
                });
            }

            // Check if section already exists for this class (excluding current section)
            const existingSection = await sectionCollection.findOne({
                name: name.trim(),
                classId: new ObjectId(classId),
                _id: { $ne: new ObjectId(id) }
            });

            if (existingSection) {
                return res.status(400).json({
                    success: false,
                    message: 'এই ক্লাসে এই নামের সেকশন ইতিমধ্যে存在 করে'
                });
            }

            const updateData = {
                name: name.trim(),
                classId: new ObjectId(classId),
                updatedAt: new Date()
            };

            const result = await sectionCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Section not found'
                });
            }

            res.json({
                success: true,
                message: 'Section updated successfully'
            });
        } catch (error) {
            console.error('Error updating section:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating section',
                error: error.message
            });
        }
    });

    // Delete section
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const result = await sectionCollection.deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Section not found'
                });
            }

            res.json({
                success: true,
                message: 'Section deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting section:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting section',
                error: error.message
            });
        }
    });

    // Get sections by class
    router.get('/class/:classId', async (req, res) => {
        try {
            const { classId } = req.params;

            const sections = await sectionCollection.find({
                classId: new ObjectId(classId),
                isActive: true
            }).toArray();

            res.json({
                success: true,
                data: sections
            });
        } catch (error) {
            console.error('Error fetching sections by class:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching sections',
                error: error.message
            });
        }
    });

    return router;
};