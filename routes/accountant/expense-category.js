const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (expenseCategoryCollection) => {

    // GET all expense categories
    router.get('/', async (req, res) => {
        try {
            const expenseCategories = await expenseCategoryCollection.find({}).sort({ createdAt: -1 }).toArray();
            
            res.json({
                success: true,
                data: expenseCategories,
                total: expenseCategories.length,
                message: 'Expense categories fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching expense categories:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching expense categories',
                error: error.message
            });
        }
    });

    // GET single expense category by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid expense category ID'
                });
            }

            const expenseCategory = await expenseCategoryCollection.findOne({ _id: new ObjectId(id) });
            
            if (!expenseCategory) {
                return res.status(404).json({
                    success: false,
                    message: 'Expense category not found'
                });
            }

            res.json({
                success: true,
                data: expenseCategory,
                message: 'Expense category fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching expense category:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching expense category',
                error: error.message
            });
        }
    });

    // CREATE new expense category
    router.post('/', async (req, res) => {
        try {
            const { name } = req.body;

            // Validation
            if (!name || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Expense category name is required'
                });
            }

            // Check if expense category already exists
            const existingCategory = await expenseCategoryCollection.findOne({ 
                name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
            });

            if (existingCategory) {
                return res.status(400).json({
                    success: false,
                    message: 'Expense category already exists'
                });
            }

            const newExpenseCategory = {
                name: name.trim(),
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await expenseCategoryCollection.insertOne(newExpenseCategory);
            
            res.status(201).json({
                success: true,
                message: 'Expense category created successfully',
                data: {
                    _id: result.insertedId,
                    ...newExpenseCategory
                }
            });
        } catch (error) {
            console.error('Error creating expense category:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating expense category',
                error: error.message
            });
        }
    });

    // UPDATE expense category
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { name, isActive } = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid expense category ID'
                });
            }

            // Check if expense category exists
            const existingCategory = await expenseCategoryCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingCategory) {
                return res.status(404).json({
                    success: false,
                    message: 'Expense category not found'
                });
            }

            // Check if name already exists (excluding current category)
            if (name && name !== existingCategory.name) {
                const duplicateCategory = await expenseCategoryCollection.findOne({ 
                    name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
                    _id: { $ne: new ObjectId(id) }
                });

                if (duplicateCategory) {
                    return res.status(400).json({
                        success: false,
                        message: 'Expense category name already exists'
                    });
                }
            }

            const updateData = {
                updatedAt: new Date()
            };

            if (name !== undefined) updateData.name = name.trim();
            if (isActive !== undefined) updateData.isActive = Boolean(isActive);

            const result = await expenseCategoryCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            res.json({
                success: true,
                message: 'Expense category updated successfully',
                data: {
                    _id: id,
                    ...updateData
                }
            });
        } catch (error) {
            console.error('Error updating expense category:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating expense category',
                error: error.message
            });
        }
    });

    // DELETE expense category
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid expense category ID'
                });
            }

            const result = await expenseCategoryCollection.deleteOne({ 
                _id: new ObjectId(id) 
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Expense category not found'
                });
            }

            res.json({
                success: true,
                message: 'Expense category deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting expense category:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting expense category',
                error: error.message
            });
        }
    });

    // TOGGLE expense category status
    router.patch('/:id/toggle-status', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid expense category ID'
                });
            }

            const expenseCategory = await expenseCategoryCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!expenseCategory) {
                return res.status(404).json({
                    success: false,
                    message: 'Expense category not found'
                });
            }

            const newStatus = !expenseCategory.isActive;

            await expenseCategoryCollection.updateOne(
                { _id: new ObjectId(id) },
                { 
                    $set: { 
                        isActive: newStatus,
                        updatedAt: new Date() 
                    } 
                }
            );

            res.json({
                success: true,
                message: `Expense category ${newStatus ? 'activated' : 'deactivated'} successfully`,
                data: {
                    isActive: newStatus
                }
            });
        } catch (error) {
            console.error('Error toggling expense category status:', error);
            res.status(500).json({
                success: false,
                message: 'Error toggling expense category status',
                error: error.message
            });
        }
    });

    return router;
};