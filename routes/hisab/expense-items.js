const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (expenseItemCollection) => {

    // GET all expense items
    router.get('/', async (req, res) => {
        try {
            const expenseItems = await expenseItemCollection
                .aggregate([
                    {
                        $lookup: {
                            from: 'expensecategories',
                            localField: 'category',
                            foreignField: '_id',
                            as: 'category'
                        }
                    },
                    {
                        $unwind: {
                            path: '$category',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $sort: { createdAt: -1 }
                    }
                ])
                .toArray();

            res.json({
                success: true,
                data: expenseItems,
                message: 'Expense items fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching expense items:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch expense items'
            });
        }
    });

    // POST new expense items (multiple)
    router.post('/', async (req, res) => {
        try {
            const { items } = req.body;

            if (!items || !Array.isArray(items) || items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Items array is required'
                });
            }

            // Validate each item
            for (let item of items) {
                if (!item.name || !item.name.trim()) {
                    return res.status(400).json({
                        success: false,
                        message: 'Expense item name is required'
                    });
                }
                if (!item.category) {
                    return res.status(400).json({
                        success: false,
                        message: 'Expense category is required'
                    });
                }
            }

            // Prepare items for insertion
            const itemsToInsert = items.map(item => ({
                name: item.name.trim(),
                category: new ObjectId(item.category),
                createdAt: new Date(),
                updatedAt: new Date()
            }));

            // Insert items
            const result = await expenseItemCollection.insertMany(itemsToInsert);

            res.json({
                success: true,
                data: result,
                message: 'Expense items created successfully'
            });

        } catch (error) {
            console.error('Error creating expense items:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create expense items'
            });
        }
    });

    // DELETE expense item
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid expense item ID'
                });
            }

            const result = await expenseItemCollection.deleteOne({ 
                _id: new ObjectId(id) 
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Expense item not found'
                });
            }

            res.json({
                success: true,
                message: 'Expense item deleted successfully'
            });

        } catch (error) {
            console.error('Error deleting expense item:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete expense item'
            });
        }
    });

    // PUT update expense item
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { name, category } = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid expense item ID'
                });
            }

            if (!name || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Expense item name is required'
                });
            }

            if (!category) {
                return res.status(400).json({
                    success: false,
                    message: 'Expense category is required'
                });
            }

            const result = await expenseItemCollection.updateOne(
                { _id: new ObjectId(id) },
                {
                    $set: {
                        name: name.trim(),
                        category: new ObjectId(category),
                        updatedAt: new Date()
                    }
                }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Expense item not found'
                });
            }

            res.json({
                success: true,
                message: 'Expense item updated successfully'
            });

        } catch (error) {
            console.error('Error updating expense item:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update expense item'
            });
        }
    });

    return router;
};