const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (paymentTypeCollection) => {

    // GET all payment types
    router.get('/', async (req, res) => {
        try {
            const paymentTypes = await paymentTypeCollection.find({}).sort({ createdAt: -1 }).toArray();
            
            res.json({
                success: true,
                data: paymentTypes,
                total: paymentTypes.length,
                message: 'Payment types fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching payment types:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching payment types',
                error: error.message
            });
        }
    });

    // GET single payment type by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid payment type ID'
                });
            }

            const paymentType = await paymentTypeCollection.findOne({ _id: new ObjectId(id) });
            
            if (!paymentType) {
                return res.status(404).json({
                    success: false,
                    message: 'Payment type not found'
                });
            }

            res.json({
                success: true,
                data: paymentType,
                message: 'Payment type fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching payment type:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching payment type',
                error: error.message
            });
        }
    });

    // CREATE new payment type
    router.post('/', async (req, res) => {
        try {
            const { name, details } = req.body;

            // Validation
            if (!name || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Payment type name is required'
                });
            }

            // Check if payment type already exists
            const existingType = await paymentTypeCollection.findOne({ 
                name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
            });

            if (existingType) {
                return res.status(400).json({
                    success: false,
                    message: 'Payment type already exists'
                });
            }

            const newPaymentType = {
                name: name.trim(),
                details: details?.trim() || '',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await paymentTypeCollection.insertOne(newPaymentType);
            
            res.status(201).json({
                success: true,
                message: 'Payment type created successfully',
                data: {
                    _id: result.insertedId,
                    ...newPaymentType
                }
            });
        } catch (error) {
            console.error('Error creating payment type:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating payment type',
                error: error.message
            });
        }
    });

    // UPDATE payment type
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { name, details, isActive } = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid payment type ID'
                });
            }

            // Check if payment type exists
            const existingType = await paymentTypeCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingType) {
                return res.status(404).json({
                    success: false,
                    message: 'Payment type not found'
                });
            }

            // Check if name already exists (excluding current type)
            if (name && name !== existingType.name) {
                const duplicateType = await paymentTypeCollection.findOne({ 
                    name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
                    _id: { $ne: new ObjectId(id) }
                });

                if (duplicateType) {
                    return res.status(400).json({
                        success: false,
                        message: 'Payment type name already exists'
                    });
                }
            }

            const updateData = {
                updatedAt: new Date()
            };

            if (name !== undefined) updateData.name = name.trim();
            if (details !== undefined) updateData.details = details.trim();
            if (isActive !== undefined) updateData.isActive = Boolean(isActive);

            const result = await paymentTypeCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            res.json({
                success: true,
                message: 'Payment type updated successfully',
                data: {
                    _id: id,
                    ...updateData
                }
            });
        } catch (error) {
            console.error('Error updating payment type:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating payment type',
                error: error.message
            });
        }
    });

    // DELETE payment type
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid payment type ID'
                });
            }

            const result = await paymentTypeCollection.deleteOne({ 
                _id: new ObjectId(id) 
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Payment type not found'
                });
            }

            res.json({
                success: true,
                message: 'Payment type deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting payment type:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting payment type',
                error: error.message
            });
        }
    });

    // TOGGLE payment type status
    router.patch('/:id/toggle-status', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid payment type ID'
                });
            }

            const paymentType = await paymentTypeCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!paymentType) {
                return res.status(404).json({
                    success: false,
                    message: 'Payment type not found'
                });
            }

            const newStatus = !paymentType.isActive;

            await paymentTypeCollection.updateOne(
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
                message: `Payment type ${newStatus ? 'activated' : 'deactivated'} successfully`,
                data: {
                    isActive: newStatus
                }
            });
        } catch (error) {
            console.error('Error toggling payment type status:', error);
            res.status(500).json({
                success: false,
                message: 'Error toggling payment type status',
                error: error.message
            });
        }
    });

    return router;
};