const express = require('express');
const router = express.Router();

module.exports = (advanceFeesCollection) => {
    
    // GET all advance fees
    router.get('/', async (req, res) => {
        try {
            const advanceFees = await advanceFeesCollection.find({}).toArray();
            
            res.json({
                success: true,
                data: advanceFees
            });
        } catch (error) {
            console.error('Error fetching advance fees:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    });

    // POST create new advance fee
    router.post('/', async (req, res) => {
        try {
            const {
                classId,
                batchId,
                sectionId,
                sessionId,
                monthlyFee,
                sendAttendanceSMS,
                generateFeesTo
            } = req.body;

            // Validation
            if (!classId || !batchId || !sectionId || !sessionId || !monthlyFee) {
                return res.status(400).json({
                    success: false,
                    message: 'All required fields must be provided'
                });
            }

            // Check if advance fee already exists for this combination
            const existingFee = await advanceFeesCollection.findOne({
                classId,
                batchId,
                sectionId,
                sessionId
            });

            if (existingFee) {
                return res.status(400).json({
                    success: false,
                    message: 'Advance fee already exists for this class, batch, section, and session combination'
                });
            }

            const advanceFeeData = {
                classId,
                batchId,
                sectionId,
                sessionId,
                monthlyFee: parseFloat(monthlyFee),
                sendAttendanceSMS: Boolean(sendAttendanceSMS),
                generateFeesTo: generateFeesTo || 'january',
                status: 'active',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await advanceFeesCollection.insertOne(advanceFeeData);

            if (result.acknowledged) {
                res.json({
                    success: true,
                    message: 'Advance fee created successfully',
                    data: {
                        id: result.insertedId,
                        ...advanceFeeData
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to create advance fee'
                });
            }
        } catch (error) {
            console.error('Error creating advance fee:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    });

    // PUT update advance fee
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = {
                ...req.body,
                updatedAt: new Date()
            };

            // Convert monthlyFee to number if present
            if (updateData.monthlyFee) {
                updateData.monthlyFee = parseFloat(updateData.monthlyFee);
            }

            const result = await advanceFeesCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.modifiedCount > 0) {
                res.json({
                    success: true,
                    message: 'Advance fee updated successfully'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Advance fee not found'
                });
            }
        } catch (error) {
            console.error('Error updating advance fee:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    });

    // DELETE advance fee
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const result = await advanceFeesCollection.deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount > 0) {
                res.json({
                    success: true,
                    message: 'Advance fee deleted successfully'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Advance fee not found'
                });
            }
        } catch (error) {
            console.error('Error deleting advance fee:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    });

    return router;
};