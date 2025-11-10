const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const upload = require('../../middleware/upload');

module.exports = (expensesCollection) => {

    // GET all expenses with filters
    router.get('/', async (req, res) => {
        try {
            const { 
                expenseCategory, 
                month, 
                year, 
                fromDate, 
                toDate, 
                accountId,
                userId 
            } = req.query;

            let filter = {};

            // Apply filters
            if (expenseCategory && expenseCategory !== 'all') {
                filter.expenseCategoryId = expenseCategory;
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

            const expenses = await expensesCollection.find(filter).sort({ date: -1, createdAt: -1 }).toArray();
            
            // Calculate total expense
            const totalExpense = expenses.reduce((sum, expense) => sum + expense.totalAmount, 0);

            res.json({
                success: true,
                data: expenses,
                total: expenses.length,
                totalExpense: totalExpense,
                message: 'Expenses fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching expenses:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching expenses',
                error: error.message
            });
        }
    });

    // GET single expense by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid expense ID'
                });
            }

            const expense = await expensesCollection.findOne({ _id: new ObjectId(id) });
            
            if (!expense) {
                return res.status(404).json({
                    success: false,
                    message: 'Expense not found'
                });
            }

            res.json({
                success: true,
                data: expense,
                message: 'Expense fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching expense:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching expense',
                error: error.message
            });
        }
    });

    // CREATE new expense with file upload
    router.post('/', upload.single('voucher'), async (req, res) => {
        try {
            console.log('Request body:', req.body);
            console.log('Request file:', req.file);

            const { 
                accountId,
                date,
                expenseItems,
                description,
                note,
                paymentStatus,
                totalAmount
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

            // Parse expense items if it's a string
            let parsedExpenseItems = [];
            try {
                if (typeof expenseItems === 'string') {
                    parsedExpenseItems = JSON.parse(expenseItems);
                } else if (Array.isArray(expenseItems)) {
                    parsedExpenseItems = expenseItems;
                }
            } catch (parseError) {
                console.error('Error parsing expense items:', parseError);
                return res.status(400).json({
                    success: false,
                    message: 'Invalid expense items format'
                });
            }

            if (!parsedExpenseItems || !Array.isArray(parsedExpenseItems) || parsedExpenseItems.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'At least one expense item is required'
                });
            }

            // Validate each expense item
            for (let i = 0; i < parsedExpenseItems.length; i++) {
                const item = parsedExpenseItems[i];
                if (!item.expenseCategoryId) {
                    return res.status(400).json({
                        success: false,
                        message: `Expense category is required for item ${i + 1}`
                    });
                }
                if (!item.expenseItemId) {
                    return res.status(400).json({
                        success: false,
                        message: `Expense item is required for item ${i + 1}`
                    });
                }
                if (!item.amount || item.amount <= 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Valid amount is required for item ${i + 1}`
                    });
                }
            }

            if (!totalAmount || totalAmount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid total amount is required'
                });
            }

            const dateObj = new Date(date);
            const month = dateObj.toLocaleString('en-US', { month: 'long' });
            const year = dateObj.getFullYear().toString();

            // Parse expense items properly
            const processedExpenseItems = parsedExpenseItems.map(item => ({
                expenseCategoryId: item.expenseCategoryId,
                expenseItemId: item.expenseItemId,
                quantity: parseInt(item.quantity) || 1,
                amount: parseFloat(item.amount),
                subtotal: parseFloat(item.subtotal) || (parseInt(item.quantity) || 1) * parseFloat(item.amount),
                description: item.description || ''
            }));

            const newExpense = {
                accountId,
                date: dateObj,
                expenseItems: processedExpenseItems,
                totalAmount: parseFloat(totalAmount),
                description: description?.trim() || '',
                note: note?.trim() || '',
                paymentStatus: paymentStatus || 'Cash',
                voucher: req.file ? `/api/uploads/${req.file.filename}` : null,
                month,
                year,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            console.log('New expense to insert:', newExpense);

            const result = await expensesCollection.insertOne(newExpense);
            
            res.status(201).json({
                success: true,
                message: 'Expense created successfully',
                data: {
                    _id: result.insertedId,
                    ...newExpense
                }
            });
        } catch (error) {
            console.error('Error creating expense:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating expense',
                error: error.message
            });
        }
    });

    // UPDATE expense
    router.put('/:id', upload.single('voucher'), async (req, res) => {
        try {
            const { id } = req.params;
            const { 
                accountId,
                date,
                expenseItems,
                description,
                note,
                paymentStatus,
                totalAmount
            } = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid expense ID'
                });
            }

            // Check if expense exists
            const existingExpense = await expensesCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingExpense) {
                return res.status(404).json({
                    success: false,
                    message: 'Expense not found'
                });
            }

            const dateObj = date ? new Date(date) : existingExpense.date;
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
            
            // Parse expense items
            if (expenseItems !== undefined) {
                let parsedExpenseItems = [];
                try {
                    if (typeof expenseItems === 'string') {
                        parsedExpenseItems = JSON.parse(expenseItems);
                    } else if (Array.isArray(expenseItems)) {
                        parsedExpenseItems = expenseItems;
                    }
                } catch (parseError) {
                    console.error('Error parsing expense items:', parseError);
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid expense items format'
                    });
                }

                const processedExpenseItems = parsedExpenseItems.map(item => ({
                    expenseCategoryId: item.expenseCategoryId,
                    expenseItemId: item.expenseItemId,
                    quantity: parseInt(item.quantity) || 1,
                    amount: parseFloat(item.amount),
                    subtotal: parseFloat(item.subtotal) || (parseInt(item.quantity) || 1) * parseFloat(item.amount),
                    description: item.description || ''
                }));
                updateData.expenseItems = processedExpenseItems;
            }
            
            if (totalAmount !== undefined) updateData.totalAmount = parseFloat(totalAmount);
            if (description !== undefined) updateData.description = description.trim();
            if (note !== undefined) updateData.note = note.trim();
            if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
            
            // Handle file upload
            if (req.file) {
                updateData.voucher = `/api/uploads/${req.file.filename}`;
            }

            const result = await expensesCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            res.json({
                success: true,
                message: 'Expense updated successfully',
                data: {
                    _id: id,
                    ...updateData
                }
            });
        } catch (error) {
            console.error('Error updating expense:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating expense',
                error: error.message
            });
        }
    });

    // DELETE expense
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid expense ID'
                });
            }

            const result = await expensesCollection.deleteOne({ 
                _id: new ObjectId(id) 
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Expense not found'
                });
            }

            res.json({
                success: true,
                message: 'Expense deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting expense:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting expense',
                error: error.message
            });
        }
    });

    return router;
};