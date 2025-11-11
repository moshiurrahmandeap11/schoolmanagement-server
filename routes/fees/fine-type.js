const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (fineTypeCollection) => {

    // Get all fine types
    router.get('/', async (req, res) => {
        try {
            const fineTypes = await fineTypeCollection.find({}).toArray();
            
            res.status(200).json({
                success: true,
                message: 'Fine types fetched successfully',
                data: fineTypes
            });
        } catch (error) {
            console.error('Error fetching fine types:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch fine types',
                error: error.message
            });
        }
    });

    // Create new fine type
    router.post('/', async (req, res) => {
        try {
            const { 
                name, 
                isParcel, 
                fineAmount, 
                percentage, 
                isAbsenceFine, 
                fixedDate 
            } = req.body;

            // Validation
            if (!name || name.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Fine type name is required'
                });
            }

            if (!isParcel && (!fineAmount || fineAmount < 0)) {
                return res.status(400).json({
                    success: false,
                    message: 'Fine amount is required and must be positive'
                });
            }

            if (isParcel && (!percentage || percentage < 0 || percentage > 100)) {
                return res.status(400).json({
                    success: false,
                    message: 'Percentage must be between 0 and 100'
                });
            }

            // Check if fine type name already exists
            const existingFineType = await fineTypeCollection.findOne({ 
                name: name.trim() 
            });

            if (existingFineType) {
                return res.status(400).json({
                    success: false,
                    message: 'Fine type name already exists'
                });
            }

            const newFineType = {
                name: name.trim(),
                isParcel: Boolean(isParcel),
                fineAmount: isParcel ? 0 : parseFloat(fineAmount),
                percentage: isParcel ? parseFloat(percentage) : 0,
                isAbsenceFine: Boolean(isAbsenceFine),
                fixedDate: fixedDate || null,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await fineTypeCollection.insertOne(newFineType);

            res.status(201).json({
                success: true,
                message: 'Fine type created successfully',
                data: {
                    _id: result.insertedId,
                    ...newFineType
                }
            });
        } catch (error) {
            console.error('Error creating fine type:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create fine type',
                error: error.message
            });
        }
    });

    // Update fine type
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { 
                name, 
                isParcel, 
                fineAmount, 
                percentage, 
                isAbsenceFine, 
                fixedDate 
            } = req.body;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid fine type ID'
                });
            }

            // Validation
            if (!name || name.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Fine type name is required'
                });
            }

            if (!isParcel && (!fineAmount || fineAmount < 0)) {
                return res.status(400).json({
                    success: false,
                    message: 'Fine amount is required and must be positive'
                });
            }

            if (isParcel && (!percentage || percentage < 0 || percentage > 100)) {
                return res.status(400).json({
                    success: false,
                    message: 'Percentage must be between 0 and 100'
                });
            }

            // Check if fine type exists
            const existingFineType = await fineTypeCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingFineType) {
                return res.status(404).json({
                    success: false,
                    message: 'Fine type not found'
                });
            }

            // Check if fine type name already exists (excluding current one)
            const duplicateFineType = await fineTypeCollection.findOne({
                name: name.trim(),
                _id: { $ne: new ObjectId(id) }
            });

            if (duplicateFineType) {
                return res.status(400).json({
                    success: false,
                    message: 'Fine type name already exists'
                });
            }

            const updatedFineType = {
                name: name.trim(),
                isParcel: Boolean(isParcel),
                fineAmount: isParcel ? 0 : parseFloat(fineAmount),
                percentage: isParcel ? parseFloat(percentage) : 0,
                isAbsenceFine: Boolean(isAbsenceFine),
                fixedDate: fixedDate || null,
                updatedAt: new Date()
            };

            const result = await fineTypeCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedFineType }
            );

            if (result.modifiedCount === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No changes made to the fine type'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Fine type updated successfully',
                data: {
                    _id: id,
                    ...updatedFineType,
                    isActive: existingFineType.isActive,
                    createdAt: existingFineType.createdAt
                }
            });
        } catch (error) {
            console.error('Error updating fine type:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update fine type',
                error: error.message
            });
        }
    });

    // Delete fine type
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid fine type ID'
                });
            }

            // Check if fine type exists
            const existingFineType = await fineTypeCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingFineType) {
                return res.status(404).json({
                    success: false,
                    message: 'Fine type not found'
                });
            }

            const result = await fineTypeCollection.deleteOne({ 
                _id: new ObjectId(id) 
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Fine type not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Fine type deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting fine type:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete fine type',
                error: error.message
            });
        }
    });

    // Toggle fine type status
    router.patch('/:id/toggle-status', async (req, res) => {
        try {
            const { id } = req.params;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid fine type ID'
                });
            }

            // Check if fine type exists
            const existingFineType = await fineTypeCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingFineType) {
                return res.status(404).json({
                    success: false,
                    message: 'Fine type not found'
                });
            }

            const newStatus = !existingFineType.isActive;

            const result = await fineTypeCollection.updateOne(
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
                    message: 'Failed to update fine type status'
                });
            }

            res.status(200).json({
                success: true,
                message: `Fine type ${newStatus ? 'activated' : 'deactivated'} successfully`,
                data: {
                    isActive: newStatus
                }
            });
        } catch (error) {
            console.error('Error toggling fine type status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to toggle fine type status',
                error: error.message
            });
        }
    });

    return router;
};