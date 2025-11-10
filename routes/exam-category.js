const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (examCategoryCollection) => {

    // GET all exam categories
    router.get('/', async (req, res) => {
        try {
            const categories = await examCategoryCollection.find({}).sort({ createdAt: -1 }).toArray();
            
            res.json({
                success: true,
                data: categories,
                message: 'Exam categories fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching exam categories:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching exam categories',
                error: error.message
            });
        }
    });

    // GET single exam category by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid category ID'
                });
            }

            const category = await examCategoryCollection.findOne({ _id: new ObjectId(id) });
            
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Exam category not found'
                });
            }

            res.json({
                success: true,
                data: category,
                message: 'Exam category fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching exam category:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching exam category',
                error: error.message
            });
        }
    });

    // CREATE new exam category
    router.post('/', async (req, res) => {
        try {
            const categoryData = req.body;

            // Validate required fields
            if (!categoryData.name || !categoryData.totalMarks || !categoryData.passMarks || !categoryData.weight) {
                return res.status(400).json({
                    success: false,
                    message: 'All fields are required'
                });
            }

            // Check if category name already exists
            const existingCategory = await examCategoryCollection.findOne({ 
                name: { $regex: new RegExp(`^${categoryData.name}$`, 'i') } 
            });

            if (existingCategory) {
                return res.status(400).json({
                    success: false,
                    message: 'Exam category name already exists'
                });
            }

            const newCategory = {
                name: categoryData.name,
                isMain: categoryData.isMain || false,
                totalMarks: parseFloat(categoryData.totalMarks),
                passMarks: parseFloat(categoryData.passMarks),
                weight: parseFloat(categoryData.weight),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await examCategoryCollection.insertOne(newCategory);
            
            res.status(201).json({
                success: true,
                message: 'Exam category created successfully',
                data: {
                    _id: result.insertedId,
                    ...newCategory
                }
            });
        } catch (error) {
            console.error('Error creating exam category:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating exam category',
                error: error.message
            });
        }
    });

    // UPDATE exam category
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const categoryData = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid category ID'
                });
            }

            // Validate required fields
            if (!categoryData.name || !categoryData.totalMarks || !categoryData.passMarks || !categoryData.weight) {
                return res.status(400).json({
                    success: false,
                    message: 'All fields are required'
                });
            }

            // Check if category name already exists (excluding current category)
            const existingCategory = await examCategoryCollection.findOne({ 
                name: { $regex: new RegExp(`^${categoryData.name}$`, 'i') },
                _id: { $ne: new ObjectId(id) }
            });

            if (existingCategory) {
                return res.status(400).json({
                    success: false,
                    message: 'Exam category name already exists'
                });
            }

            const updateData = {
                name: categoryData.name,
                isMain: categoryData.isMain || false,
                totalMarks: parseFloat(categoryData.totalMarks),
                passMarks: parseFloat(categoryData.passMarks),
                weight: parseFloat(categoryData.weight),
                updatedAt: new Date()
            };

            const result = await examCategoryCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Exam category not found'
                });
            }

            res.json({
                success: true,
                message: 'Exam category updated successfully',
                data: {
                    _id: id,
                    ...updateData
                }
            });
        } catch (error) {
            console.error('Error updating exam category:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating exam category',
                error: error.message
            });
        }
    });

    // DELETE exam category
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid category ID'
                });
            }

            const result = await examCategoryCollection.deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Exam category not found'
                });
            }

            res.json({
                success: true,
                message: 'Exam category deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting exam category:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting exam category',
                error: error.message
            });
        }
    });

    return router;
};