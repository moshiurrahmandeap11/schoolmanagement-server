const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (feeCollection) => {

    // Get all fee allocations
    router.get('/', async (req, res) => {
        try {
            const fees = await feeCollection.find({}).toArray();
            
            res.status(200).json({
                success: true,
                message: 'Fee allocations fetched successfully',
                data: fees
            });
        } catch (error) {
            console.error('Error fetching fee allocations:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch fee allocations',
                error: error.message
            });
        }
    });

    // Create new fee allocation
    router.post('/', async (req, res) => {
        try {
            const { 
                feeTypeId,
                feeTypeName,
                feeTypeAmount,
                classId,
                className,
                sessionId,
                sessionName,
                feeApplicableFrom,
                feeEndDate
            } = req.body;

            // Validation
            if (!feeTypeId) {
                return res.status(400).json({
                    success: false,
                    message: 'Fee type selection is required'
                });
            }

            if (!classId) {
                return res.status(400).json({
                    success: false,
                    message: 'Class selection is required'
                });
            }

            if (!sessionId) {
                return res.status(400).json({
                    success: false,
                    message: 'Session selection is required'
                });
            }

            if (!feeApplicableFrom) {
                return res.status(400).json({
                    success: false,
                    message: 'Fee applicable from date is required'
                });
            }

            // Check if fee allocation already exists for this class and session
            const existingFee = await feeCollection.findOne({ 
                feeTypeId: feeTypeId,
                classId: classId,
                sessionId: sessionId
            });

            if (existingFee) {
                return res.status(400).json({
                    success: false,
                    message: 'Fee allocation already exists for this class and session'
                });
            }

            const newFee = {
                feeTypeId: feeTypeId,
                feeTypeName: feeTypeName || '',
                feeTypeAmount: parseFloat(feeTypeAmount) || 0,
                classId: classId,
                className: className || '',
                sessionId: sessionId,
                sessionName: sessionName || '',
                feeApplicableFrom: new Date(feeApplicableFrom),
                feeEndDate: feeEndDate ? new Date(feeEndDate) : null,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await feeCollection.insertOne(newFee);

            res.status(201).json({
                success: true,
                message: 'Fee allocation created successfully',
                data: {
                    _id: result.insertedId,
                    ...newFee
                }
            });
        } catch (error) {
            console.error('Error creating fee allocation:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create fee allocation',
                error: error.message
            });
        }
    });

    // Update fee allocation
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { 
                feeTypeId,
                feeTypeName,
                feeTypeAmount,
                classId,
                className,
                sessionId,
                sessionName,
                feeApplicableFrom,
                feeEndDate
            } = req.body;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid fee allocation ID'
                });
            }

            // Validation
            if (!feeTypeId) {
                return res.status(400).json({
                    success: false,
                    message: 'Fee type selection is required'
                });
            }

            if (!classId) {
                return res.status(400).json({
                    success: false,
                    message: 'Class selection is required'
                });
            }

            if (!sessionId) {
                return res.status(400).json({
                    success: false,
                    message: 'Session selection is required'
                });
            }

            if (!feeApplicableFrom) {
                return res.status(400).json({
                    success: false,
                    message: 'Fee applicable from date is required'
                });
            }

            // Check if fee allocation exists
            const existingFee = await feeCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingFee) {
                return res.status(404).json({
                    success: false,
                    message: 'Fee allocation not found'
                });
            }

            // Check if fee allocation already exists for this class and session (excluding current one)
            const duplicateFee = await feeCollection.findOne({
                feeTypeId: feeTypeId,
                classId: classId,
                sessionId: sessionId,
                _id: { $ne: new ObjectId(id) }
            });

            if (duplicateFee) {
                return res.status(400).json({
                    success: false,
                    message: 'Fee allocation already exists for this class and session'
                });
            }

            const updatedFee = {
                feeTypeId: feeTypeId,
                feeTypeName: feeTypeName || '',
                feeTypeAmount: parseFloat(feeTypeAmount) || 0,
                classId: classId,
                className: className || '',
                sessionId: sessionId,
                sessionName: sessionName || '',
                feeApplicableFrom: new Date(feeApplicableFrom),
                feeEndDate: feeEndDate ? new Date(feeEndDate) : null,
                updatedAt: new Date()
            };

            const result = await feeCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedFee }
            );

            if (result.modifiedCount === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No changes made to the fee allocation'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Fee allocation updated successfully',
                data: {
                    _id: id,
                    ...updatedFee,
                    isActive: existingFee.isActive,
                    createdAt: existingFee.createdAt
                }
            });
        } catch (error) {
            console.error('Error updating fee allocation:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update fee allocation',
                error: error.message
            });
        }
    });

    // Delete fee allocation
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid fee allocation ID'
                });
            }

            // Check if fee allocation exists
            const existingFee = await feeCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingFee) {
                return res.status(404).json({
                    success: false,
                    message: 'Fee allocation not found'
                });
            }

            const result = await feeCollection.deleteOne({ 
                _id: new ObjectId(id) 
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Fee allocation not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Fee allocation deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting fee allocation:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete fee allocation',
                error: error.message
            });
        }
    });

    // Toggle fee allocation status
    router.patch('/:id/toggle-status', async (req, res) => {
        try {
            const { id } = req.params;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid fee allocation ID'
                });
            }

            // Check if fee allocation exists
            const existingFee = await feeCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingFee) {
                return res.status(404).json({
                    success: false,
                    message: 'Fee allocation not found'
                });
            }

            const newStatus = !existingFee.isActive;

            const result = await feeCollection.updateOne(
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
                    message: 'Failed to update fee allocation status'
                });
            }

            res.status(200).json({
                success: true,
                message: `Fee allocation ${newStatus ? 'activated' : 'deactivated'} successfully`,
                data: {
                    isActive: newStatus
                }
            });
        } catch (error) {
            console.error('Error toggling fee allocation status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to toggle fee allocation status',
                error: error.message
            });
        }
    });

    return router;
};