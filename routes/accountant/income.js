const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const upload = require('../../middleware/upload');

module.exports = (incomeCollection) => {

    // GET all incomes with filters
    router.get('/', async (req, res) => {
        try {
            const { 
                incomeSource, 
                month, 
                year, 
                fromDate, 
                toDate, 
                accountId,
                userId 
            } = req.query;

            let filter = {};

            // Apply filters
            if (incomeSource && incomeSource !== 'all') {
                filter.incomeSourceId = incomeSource;
            }

            if (month && month !== 'all') {
                filter.month = month;
            }

            if (year && year !== 'all') {
                filter.year = year;
            }

            if (fromDate && toDate) {
                filter.date = {
                    $gte: new Date(fromDate),
                    $lte: new Date(toDate)
                };
            }

            if (accountId && accountId !== 'all') {
                filter.accountId = accountId;
            }

            if (userId && userId !== 'all') {
                filter.userId = userId;
            }

            const incomes = await incomeCollection.find(filter).sort({ date: -1, createdAt: -1 }).toArray();
            
            // Calculate total income
            const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);

            res.json({
                success: true,
                data: incomes,
                total: incomes.length,
                totalIncome: totalIncome,
                message: 'Incomes fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching incomes:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching incomes',
                error: error.message
            });
        }
    });

    // GET single income by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid income ID'
                });
            }

            const income = await incomeCollection.findOne({ _id: new ObjectId(id) });
            
            if (!income) {
                return res.status(404).json({
                    success: false,
                    message: 'Income not found'
                });
            }

            res.json({
                success: true,
                data: income,
                message: 'Income fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching income:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching income',
                error: error.message
            });
        }
    });

    // CREATE new income with file upload
    router.post('/', upload.single('receipt'), async (req, res) => {
        try {
            const { 
                accountId,
                date,
                amount,
                incomeSourceId,
                paymentTypeId,
                description,
                note
            } = req.body;

            // Validation
            if (!accountId) {
                return res.status(400).json({
                    success: false,
                    message: 'Account is required'
                });
            }

            if (!date) {
                return res.status(400).json({
                    success: false,
                    message: 'Date is required'
                });
            }

            if (!amount || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid amount is required'
                });
            }

            if (!incomeSourceId) {
                return res.status(400).json({
                    success: false,
                    message: 'Income source is required'
                });
            }

            const dateObj = new Date(date);
            const month = dateObj.toLocaleString('en-US', { month: 'long' });
            const year = dateObj.getFullYear().toString();

            const newIncome = {
                accountId,
                date: dateObj,
                amount: parseFloat(amount),
                incomeSourceId,
                paymentTypeId: paymentTypeId || null,
                description: description?.trim() || '',
                note: note?.trim() || '',
                receipt: req.file ? `/api/uploads/${req.file.filename}` : null,
                month,
                year,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await incomeCollection.insertOne(newIncome);
            
            res.status(201).json({
                success: true,
                message: 'Income created successfully',
                data: {
                    _id: result.insertedId,
                    ...newIncome
                }
            });
        } catch (error) {
            console.error('Error creating income:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating income',
                error: error.message
            });
        }
    });

    // UPDATE income
    router.put('/:id', upload.single('receipt'), async (req, res) => {
        try {
            const { id } = req.params;
            const { 
                accountId,
                date,
                amount,
                incomeSourceId,
                paymentTypeId,
                description,
                note
            } = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid income ID'
                });
            }

            // Check if income exists
            const existingIncome = await incomeCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingIncome) {
                return res.status(404).json({
                    success: false,
                    message: 'Income not found'
                });
            }

            const dateObj = date ? new Date(date) : existingIncome.date;
            const month = dateObj.toLocaleString('en-US', { month: 'long' });
            const year = dateObj.getFullYear().toString();

            const updateData = {
                updatedAt: new Date()
            };

            if (accountId !== undefined) updateData.accountId = accountId;
            if (date !== undefined) {
                updateData.date = dateObj;
                updateData.month = month;
                updateData.year = year;
            }
            if (amount !== undefined) updateData.amount = parseFloat(amount);
            if (incomeSourceId !== undefined) updateData.incomeSourceId = incomeSourceId;
            if (paymentTypeId !== undefined) updateData.paymentTypeId = paymentTypeId;
            if (description !== undefined) updateData.description = description.trim();
            if (note !== undefined) updateData.note = note.trim();
            
            // Handle file upload
            if (req.file) {
                updateData.receipt = `/api/uploads/${req.file.filename}`;
            }

            const result = await incomeCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            res.json({
                success: true,
                message: 'Income updated successfully',
                data: {
                    _id: id,
                    ...updateData
                }
            });
        } catch (error) {
            console.error('Error updating income:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating income',
                error: error.message
            });
        }
    });

    // DELETE income
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid income ID'
                });
            }

            const result = await incomeCollection.deleteOne({ 
                _id: new ObjectId(id) 
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Income not found'
                });
            }

            res.json({
                success: true,
                message: 'Income deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting income:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting income',
                error: error.message
            });
        }
    });

    // GET income statistics
    router.get('/stats/summary', async (req, res) => {
        try {
            const { year } = req.query;
            let filter = {};

            if (year && year !== 'all') {
                filter.year = year;
            }

            const currentYear = new Date().getFullYear().toString();
            const selectedYear = year && year !== 'all' ? year : currentYear;

            // Get total income for selected year
            const totalIncomeResult = await incomeCollection.aggregate([
                { $match: { year: selectedYear } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]).toArray();

            const totalIncome = totalIncomeResult.length > 0 ? totalIncomeResult[0].total : 0;

            // Get monthly breakdown
            const monthlyBreakdown = await incomeCollection.aggregate([
                { $match: { year: selectedYear } },
                { $group: { 
                    _id: '$month', 
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }},
                { $sort: { 
                    _id: 1 
                }}
            ]).toArray();

            // Get top income sources
            const topSources = await incomeCollection.aggregate([
                { $match: { year: selectedYear } },
                { $group: { 
                    _id: '$incomeSourceId', 
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }},
                { $sort: { total: -1 } },
                { $limit: 5 }
            ]).toArray();

            res.json({
                success: true,
                data: {
                    totalIncome,
                    monthlyBreakdown,
                    topSources,
                    selectedYear
                },
                message: 'Income statistics fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching income statistics:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching income statistics',
                error: error.message
            });
        }
    });

    return router;
};