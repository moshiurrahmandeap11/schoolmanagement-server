const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (feeTypeCollection) => {

    // Get all fee types
    router.get('/', async (req, res) => {
        try {
            const feeTypes = await feeTypeCollection.find({}).toArray();
            
            res.status(200).json({
                success: true,
                message: 'Fee types fetched successfully',
                data: feeTypes
            });
        } catch (error) {
            console.error('Error fetching fee types:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch fee types',
                error: error.message
            });
        }
    });

    // Create new fee type
    router.post('/', async (req, res) => {
        try {
            const { 
                name, 
                amount, 
                isMonthly, 
                feeApplicable, 
                feeEndsDate, 
                description, 
                sessionId, 
                classId,
                className,
                sessionName
            } = req.body;

            // Validation
            if (!name || name.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Fee type name is required'
                });
            }

            if (!amount || amount < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Amount is required and must be positive'
                });
            }

            if (!sessionId) {
                return res.status(400).json({
                    success: false,
                    message: 'Session selection is required'
                });
            }

            if (!classId) {
                return res.status(400).json({
                    success: false,
                    message: 'Class selection is required'
                });
            }

            // Check if fee type name already exists for this class and session
            const existingFeeType = await feeTypeCollection.findOne({ 
                name: name.trim(),
                classId: classId,
                sessionId: sessionId
            });

            if (existingFeeType) {
                return res.status(400).json({
                    success: false,
                    message: 'Fee type name already exists for this class and session'
                });
            }

            const newFeeType = {
                name: name.trim(),
                amount: parseFloat(amount),
                isMonthly: Boolean(isMonthly),
                feeApplicable: feeApplicable || 'all_students',
                feeEndsDate: feeEndsDate ? new Date(feeEndsDate) : null,
                description: description || '',
                sessionId: sessionId,
                sessionName: sessionName || '',
                classId: classId,
                className: className || '',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await feeTypeCollection.insertOne(newFeeType);

            res.status(201).json({
                success: true,
                message: 'Fee type created successfully',
                data: {
                    _id: result.insertedId,
                    ...newFeeType
                }
            });
        } catch (error) {
            console.error('Error creating fee type:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create fee type',
                error: error.message
            });
        }
    });

    // Update fee type
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { 
                name, 
                amount, 
                isMonthly, 
                feeApplicable, 
                feeEndsDate, 
                description, 
                sessionId, 
                classId,
                className,
                sessionName
            } = req.body;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid fee type ID'
                });
            }

            // Validation
            if (!name || name.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Fee type name is required'
                });
            }

            if (!amount || amount < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Amount is required and must be positive'
                });
            }

            if (!sessionId) {
                return res.status(400).json({
                    success: false,
                    message: 'Session selection is required'
                });
            }

            if (!classId) {
                return res.status(400).json({
                    success: false,
                    message: 'Class selection is required'
                });
            }

            // Check if fee type exists
            const existingFeeType = await feeTypeCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingFeeType) {
                return res.status(404).json({
                    success: false,
                    message: 'Fee type not found'
                });
            }

            // Check if fee type name already exists for this class and session (excluding current one)
            const duplicateFeeType = await feeTypeCollection.findOne({
                name: name.trim(),
                classId: classId,
                sessionId: sessionId,
                _id: { $ne: new ObjectId(id) }
            });

            if (duplicateFeeType) {
                return res.status(400).json({
                    success: false,
                    message: 'Fee type name already exists for this class and session'
                });
            }

            const updatedFeeType = {
                name: name.trim(),
                amount: parseFloat(amount),
                isMonthly: Boolean(isMonthly),
                feeApplicable: feeApplicable || 'all_students',
                feeEndsDate: feeEndsDate ? new Date(feeEndsDate) : null,
                description: description || '',
                sessionId: sessionId,
                sessionName: sessionName || '',
                classId: classId,
                className: className || '',
                updatedAt: new Date()
            };

            const result = await feeTypeCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedFeeType }
            );

            if (result.modifiedCount === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No changes made to the fee type'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Fee type updated successfully',
                data: {
                    _id: id,
                    ...updatedFeeType,
                    isActive: existingFeeType.isActive,
                    createdAt: existingFeeType.createdAt
                }
            });
        } catch (error) {
            console.error('Error updating fee type:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update fee type',
                error: error.message
            });
        }
    });

    // Delete fee type
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid fee type ID'
                });
            }

            // Check if fee type exists
            const existingFeeType = await feeTypeCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingFeeType) {
                return res.status(404).json({
                    success: false,
                    message: 'Fee type not found'
                });
            }

            const result = await feeTypeCollection.deleteOne({ 
                _id: new ObjectId(id) 
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Fee type not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Fee type deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting fee type:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete fee type',
                error: error.message
            });
        }
    });

    // Toggle fee type status
    router.patch('/:id/toggle-status', async (req, res) => {
        try {
            const { id } = req.params;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid fee type ID'
                });
            }

            // Check if fee type exists
            const existingFeeType = await feeTypeCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingFeeType) {
                return res.status(404).json({
                    success: false,
                    message: 'Fee type not found'
                });
            }

            const newStatus = !existingFeeType.isActive;

            const result = await feeTypeCollection.updateOne(
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
                    message: 'Failed to update fee type status'
                });
            }

            res.status(200).json({
                success: true,
                message: `Fee type ${newStatus ? 'activated' : 'deactivated'} successfully`,
                data: {
                    isActive: newStatus
                }
            });
        } catch (error) {
            console.error('Error toggling fee type status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to toggle fee type status',
                error: error.message
            });
        }
    });

    return router;
};