const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (bankAccountCollection) => {

    // GET all bank accounts
    router.get('/', async (req, res) => {
        try {
            const accounts = await bankAccountCollection.find({}).sort({ createdAt: -1 }).toArray();
            
            res.json({
                success: true,
                data: accounts,
                total: accounts.length,
                message: 'Bank accounts fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching bank accounts:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching bank accounts',
                error: error.message
            });
        }
    });

    // GET single bank account by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid account ID'
                });
            }

            const account = await bankAccountCollection.findOne({ _id: new ObjectId(id) });
            
            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Bank account not found'
                });
            }

            res.json({
                success: true,
                data: account,
                message: 'Bank account fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching bank account:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching bank account',
                error: error.message
            });
        }
    });

    // CREATE new bank account
    router.post('/', async (req, res) => {
        try {
            const { name, accountNumber, branchName, currentBalance, details, isDefault } = req.body;

            // Validation
            if (!name || !accountNumber) {
                return res.status(400).json({
                    success: false,
                    message: 'Name and account number are required'
                });
            }

            // Check if account number already exists
            const existingAccount = await bankAccountCollection.findOne({ 
                accountNumber: accountNumber 
            });

            if (existingAccount) {
                return res.status(400).json({
                    success: false,
                    message: 'Account number already exists'
                });
            }

            // If setting as default, unset other default accounts
            if (isDefault) {
                await bankAccountCollection.updateMany(
                    { isDefault: true },
                    { $set: { isDefault: false } }
                );
            }

            const newAccount = {
                name: name.trim(),
                accountNumber: accountNumber.trim(),
                branchName: branchName?.trim() || '',
                currentBalance: parseFloat(currentBalance) || 0,
                details: details?.trim() || '',
                isDefault: Boolean(isDefault),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await bankAccountCollection.insertOne(newAccount);
            
            res.status(201).json({
                success: true,
                message: 'Bank account created successfully',
                data: {
                    _id: result.insertedId,
                    ...newAccount
                }
            });
        } catch (error) {
            console.error('Error creating bank account:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating bank account',
                error: error.message
            });
        }
    });

    // UPDATE bank account
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { name, accountNumber, branchName, currentBalance, details, isDefault } = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid account ID'
                });
            }

            // Check if account exists
            const existingAccount = await bankAccountCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingAccount) {
                return res.status(404).json({
                    success: false,
                    message: 'Bank account not found'
                });
            }

            // Check if account number already exists (excluding current account)
            if (accountNumber && accountNumber !== existingAccount.accountNumber) {
                const duplicateAccount = await bankAccountCollection.findOne({ 
                    accountNumber: accountNumber,
                    _id: { $ne: new ObjectId(id) }
                });

                if (duplicateAccount) {
                    return res.status(400).json({
                        success: false,
                        message: 'Account number already exists'
                    });
                }
            }

            // If setting as default, unset other default accounts
            if (isDefault) {
                await bankAccountCollection.updateMany(
                    { isDefault: true, _id: { $ne: new ObjectId(id) } },
                    { $set: { isDefault: false } }
                );
            }

            const updateData = {
                updatedAt: new Date()
            };

            if (name !== undefined) updateData.name = name.trim();
            if (accountNumber !== undefined) updateData.accountNumber = accountNumber.trim();
            if (branchName !== undefined) updateData.branchName = branchName.trim();
            if (currentBalance !== undefined) updateData.currentBalance = parseFloat(currentBalance);
            if (details !== undefined) updateData.details = details.trim();
            if (isDefault !== undefined) updateData.isDefault = Boolean(isDefault);

            const result = await bankAccountCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            res.json({
                success: true,
                message: 'Bank account updated successfully',
                data: {
                    _id: id,
                    ...updateData
                }
            });
        } catch (error) {
            console.error('Error updating bank account:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating bank account',
                error: error.message
            });
        }
    });

    // DELETE bank account
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid account ID'
                });
            }

            const result = await bankAccountCollection.deleteOne({ 
                _id: new ObjectId(id) 
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Bank account not found'
                });
            }

            res.json({
                success: true,
                message: 'Bank account deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting bank account:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting bank account',
                error: error.message
            });
        }
    });

    // SET default account
    router.patch('/:id/set-default', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid account ID'
                });
            }

            // Check if account exists
            const account = await bankAccountCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Bank account not found'
                });
            }

            // Unset all other default accounts
            await bankAccountCollection.updateMany(
                { isDefault: true },
                { $set: { isDefault: false } }
            );

            // Set this account as default
            await bankAccountCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { isDefault: true, updatedAt: new Date() } }
            );

            res.json({
                success: true,
                message: 'Bank account set as default successfully'
            });
        } catch (error) {
            console.error('Error setting default account:', error);
            res.status(500).json({
                success: false,
                message: 'Error setting default account',
                error: error.message
            });
        }
    });

    return router;
};