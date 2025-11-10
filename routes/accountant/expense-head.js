const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (expenseHeadCollection) => {

    // GET all expense heads
    router.get('/', async (req, res) => {
        try {
            const expenseHeads = await expenseHeadCollection.find({}).sort({ createdAt: -1 }).toArray();
            
            res.json({
                success: true,
                data: expenseHeads,
                total: expenseHeads.length,
                message: 'Expense heads fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching expense heads:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching expense heads',
                error: error.message
            });
        }
    });

    // GET single expense head by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid expense head ID'
                });
            }

            const expenseHead = await expenseHeadCollection.findOne({ _id: new ObjectId(id) });
            
            if (!expenseHead) {
                return res.status(404).json({
                    success: false,
                    message: 'Expense head not found'
                });
            }

            res.json({
                success: true,
                data: expenseHead,
                message: 'Expense head fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching expense head:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching expense head',
                error: error.message
            });
        }
    });

    // CREATE new expense head
    router.post('/', async (req, res) => {
        try {
            const { name, description, amount, isMonthly, applicableFrom, endsAt, sessionId, categoryId } = req.body;

            // Validation
            if (!name || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Expense head name is required'
                });
            }

            if (!amount || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid amount is required'
                });
            }

            // Check if expense head already exists
            const existingHead = await expenseHeadCollection.findOne({ 
                name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
            });

            if (existingHead) {
                return res.status(400).json({
                    success: false,
                    message: 'Expense head already exists'
                });
            }

            const newExpenseHead = {
                name: name.trim(),
                description: description?.trim() || '',
                amount: parseFloat(amount),
                isMonthly: Boolean(isMonthly),
                applicableFrom: applicableFrom ? new Date(applicableFrom) : null,
                endsAt: endsAt ? new Date(endsAt) : null,
                sessionId: sessionId || '',
                categoryId: categoryId || '',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await expenseHeadCollection.insertOne(newExpenseHead);
            
            res.status(201).json({
                success: true,
                message: 'Expense head created successfully',
                data: {
                    _id: result.insertedId,
                    ...newExpenseHead
                }
            });
        } catch (error) {
            console.error('Error creating expense head:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating expense head',
                error: error.message
            });
        }
    });

    // CREATE multiple expense heads
    router.post('/bulk', async (req, res) => {
        try {
            const { expenseHeads } = req.body;

            if (!expenseHeads || !Array.isArray(expenseHeads) || expenseHeads.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Expense heads array is required'
                });
            }

            const validHeads = expenseHeads.filter(head => 
                head.name && head.name.trim() && head.amount && head.amount > 0
            );
            
            if (validHeads.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No valid expense heads provided'
                });
            }

            // Check for duplicates in the request
            const names = validHeads.map(head => head.name.trim().toLowerCase());
            const uniqueNames = [...new Set(names)];
            
            if (names.length !== uniqueNames.length) {
                return res.status(400).json({
                    success: false,
                    message: 'Duplicate expense head names in request'
                });
            }

            // Check for existing expense heads
            const existingHeads = await expenseHeadCollection.find({
                name: { $in: uniqueNames.map(name => new RegExp(`^${name}$`, 'i')) }
            }).toArray();

            if (existingHeads.length > 0) {
                const existingNames = existingHeads.map(head => head.name);
                return res.status(400).json({
                    success: false,
                    message: `Some expense heads already exist: ${existingNames.join(', ')}`
                });
            }

            const headsToInsert = validHeads.map(head => ({
                name: head.name.trim(),
                description: head.description?.trim() || '',
                amount: parseFloat(head.amount),
                isMonthly: Boolean(head.isMonthly),
                applicableFrom: head.applicableFrom ? new Date(head.applicableFrom) : null,
                endsAt: head.endsAt ? new Date(head.endsAt) : null,
                sessionId: head.sessionId || '',
                categoryId: head.categoryId || '',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            }));

            const result = await expenseHeadCollection.insertMany(headsToInsert);
            
            res.status(201).json({
                success: true,
                message: `${headsToInsert.length} expense heads created successfully`,
                data: {
                    insertedCount: result.insertedCount,
                    expenseHeads: headsToInsert
                }
            });
        } catch (error) {
            console.error('Error creating bulk expense heads:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating expense heads',
                error: error.message
            });
        }
    });

    // UPDATE expense head
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { name, description, amount, isMonthly, applicableFrom, endsAt, sessionId, categoryId, isActive } = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid expense head ID'
                });
            }

            // Check if expense head exists
            const existingHead = await expenseHeadCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingHead) {
                return res.status(404).json({
                    success: false,
                    message: 'Expense head not found'
                });
            }

            // Check if name already exists (excluding current head)
            if (name && name !== existingHead.name) {
                const duplicateHead = await expenseHeadCollection.findOne({ 
                    name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
                    _id: { $ne: new ObjectId(id) }
                });

                if (duplicateHead) {
                    return res.status(400).json({
                        success: false,
                        message: 'Expense head name already exists'
                    });
                }
            }

            const updateData = {
                updatedAt: new Date()
            };

            if (name !== undefined) updateData.name = name.trim();
            if (description !== undefined) updateData.description = description.trim();
            if (amount !== undefined) updateData.amount = parseFloat(amount);
            if (isMonthly !== undefined) updateData.isMonthly = Boolean(isMonthly);
            if (applicableFrom !== undefined) updateData.applicableFrom = applicableFrom ? new Date(applicableFrom) : null;
            if (endsAt !== undefined) updateData.endsAt = endsAt ? new Date(endsAt) : null;
            if (sessionId !== undefined) updateData.sessionId = sessionId;
            if (categoryId !== undefined) updateData.categoryId = categoryId;
            if (isActive !== undefined) updateData.isActive = Boolean(isActive);

            const result = await expenseHeadCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            res.json({
                success: true,
                message: 'Expense head updated successfully',
                data: {
                    _id: id,
                    ...updateData
                }
            });
        } catch (error) {
            console.error('Error updating expense head:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating expense head',
                error: error.message
            });
        }
    });

    // DELETE expense head
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid expense head ID'
                });
            }

            const result = await expenseHeadCollection.deleteOne({ 
                _id: new ObjectId(id) 
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Expense head not found'
                });
            }

            res.json({
                success: true,
                message: 'Expense head deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting expense head:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting expense head',
                error: error.message
            });
        }
    });

    // TOGGLE expense head status
    router.patch('/:id/toggle-status', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid expense head ID'
                });
            }

            const expenseHead = await expenseHeadCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!expenseHead) {
                return res.status(404).json({
                    success: false,
                    message: 'Expense head not found'
                });
            }

            const newStatus = !expenseHead.isActive;

            await expenseHeadCollection.updateOne(
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
                message: `Expense head ${newStatus ? 'activated' : 'deactivated'} successfully`,
                data: {
                    isActive: newStatus
                }
            });
        } catch (error) {
            console.error('Error toggling expense head status:', error);
            res.status(500).json({
                success: false,
                message: 'Error toggling expense head status',
                error: error.message
            });
        }
    });

    return router;
};