const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (discountCollection) => {

    // Get all discounts
    router.get('/', async (req, res) => {
        try {
            const discounts = await discountCollection.find({}).toArray();
            
            res.status(200).json({
                success: true,
                message: 'Discounts fetched successfully',
                data: discounts
            });
        } catch (error) {
            console.error('Error fetching discounts:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch discounts',
                error: error.message
            });
        }
    });

    // Create new discount
    router.post('/', async (req, res) => {
        try {
            const { 
                accountId, 
                accountName,
                isPercent, 
                discountAmount, 
                percentAmount, 
                description 
            } = req.body;

            // Validation
            if (!accountId) {
                return res.status(400).json({
                    success: false,
                    message: 'Account selection is required'
                });
            }

            if (!isPercent && (!discountAmount || discountAmount < 0)) {
                return res.status(400).json({
                    success: false,
                    message: 'Discount amount is required and must be positive'
                });
            }

            if (isPercent && (!percentAmount || percentAmount < 0 || percentAmount > 100)) {
                return res.status(400).json({
                    success: false,
                    message: 'Percent amount must be between 0 and 100'
                });
            }

            const newDiscount = {
                accountId: accountId,
                accountName: accountName || '',
                isPercent: Boolean(isPercent),
                discountAmount: isPercent ? 0 : parseFloat(discountAmount),
                percentAmount: isPercent ? parseFloat(percentAmount) : 0,
                description: description || '',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await discountCollection.insertOne(newDiscount);

            res.status(201).json({
                success: true,
                message: 'Discount created successfully',
                data: {
                    _id: result.insertedId,
                    ...newDiscount
                }
            });
        } catch (error) {
            console.error('Error creating discount:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create discount',
                error: error.message
            });
        }
    });

    // Update discount
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { 
                accountId, 
                accountName,
                isPercent, 
                discountAmount, 
                percentAmount, 
                description 
            } = req.body;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid discount ID'
                });
            }

            // Validation
            if (!accountId) {
                return res.status(400).json({
                    success: false,
                    message: 'Account selection is required'
                });
            }

            if (!isPercent && (!discountAmount || discountAmount < 0)) {
                return res.status(400).json({
                    success: false,
                    message: 'Discount amount is required and must be positive'
                });
            }

            if (isPercent && (!percentAmount || percentAmount < 0 || percentAmount > 100)) {
                return res.status(400).json({
                    success: false,
                    message: 'Percent amount must be between 0 and 100'
                });
            }

            // Check if discount exists
            const existingDiscount = await discountCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingDiscount) {
                return res.status(404).json({
                    success: false,
                    message: 'Discount not found'
                });
            }

            const updatedDiscount = {
                accountId: accountId,
                accountName: accountName || '',
                isPercent: Boolean(isPercent),
                discountAmount: isPercent ? 0 : parseFloat(discountAmount),
                percentAmount: isPercent ? parseFloat(percentAmount) : 0,
                description: description || '',
                updatedAt: new Date()
            };

            const result = await discountCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedDiscount }
            );

            if (result.modifiedCount === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No changes made to the discount'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Discount updated successfully',
                data: {
                    _id: id,
                    ...updatedDiscount,
                    isActive: existingDiscount.isActive,
                    createdAt: existingDiscount.createdAt
                }
            });
        } catch (error) {
            console.error('Error updating discount:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update discount',
                error: error.message
            });
        }
    });

    // Delete discount
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid discount ID'
                });
            }

            // Check if discount exists
            const existingDiscount = await discountCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingDiscount) {
                return res.status(404).json({
                    success: false,
                    message: 'Discount not found'
                });
            }

            const result = await discountCollection.deleteOne({ 
                _id: new ObjectId(id) 
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Discount not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Discount deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting discount:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete discount',
                error: error.message
            });
        }
    });

    // Toggle discount status
    router.patch('/:id/toggle-status', async (req, res) => {
        try {
            const { id } = req.params;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid discount ID'
                });
            }

            // Check if discount exists
            const existingDiscount = await discountCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingDiscount) {
                return res.status(404).json({
                    success: false,
                    message: 'Discount not found'
                });
            }

            const newStatus = !existingDiscount.isActive;

            const result = await discountCollection.updateOne(
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
                    message: 'Failed to update discount status'
                });
            }

            res.status(200).json({
                success: true,
                message: `Discount ${newStatus ? 'activated' : 'deactivated'} successfully`,
                data: {
                    isActive: newStatus
                }
            });
        } catch (error) {
            console.error('Error toggling discount status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to toggle discount status',
                error: error.message
            });
        }
    });

    return router;
};