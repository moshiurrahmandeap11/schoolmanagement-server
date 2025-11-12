const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (smartAttendanceCollection) => {

    // GET smart attendance settings
    router.get('/', async (req, res) => {
        try {
            const settings = await smartAttendanceCollection.find({}).toArray();
            
            res.json({
                success: true,
                data: settings[0] || null,
                message: 'Smart attendance settings fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching smart attendance settings:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch smart attendance settings'
            });
        }
    });

    // POST create/update smart attendance settings
    router.post('/', async (req, res) => {
        try {
            const {
                studentEntryTime,
                studentExitTime,
                countLateAfter,
                countEarlyExitBefore,
                class: classId,
                section: sectionId,
                timezone,
                sendSms,
                smsType,
                absentAfter,
                instituteShortName,
                enableAbsentSms
            } = req.body;

            // Validation
            if (!studentEntryTime || !studentExitTime) {
                return res.status(400).json({
                    success: false,
                    message: 'Student entry time and exit time are required'
                });
            }

            if (!classId) {
                return res.status(400).json({
                    success: false,
                    message: 'Class selection is required'
                });
            }

            if (sendSms && !smsType) {
                return res.status(400).json({
                    success: false,
                    message: 'SMS type is required when SMS is enabled'
                });
            }

            // Check if settings already exist
            const existingSettings = await smartAttendanceCollection.find({}).toArray();
            
            const settingsData = {
                studentEntryTime,
                studentExitTime,
                countLateAfter: countLateAfter || 0,
                countEarlyExitBefore: countEarlyExitBefore || 0,
                class: new ObjectId(classId),
                section: sectionId ? new ObjectId(sectionId) : null,
                timezone: timezone || 'Asia/Dhaka',
                sendSms: sendSms || false,
                smsType: sendSms ? smsType : null,
                absentAfter: absentAfter || null,
                instituteShortName: instituteShortName || '',
                enableAbsentSms: enableAbsentSms || false,
                updatedAt: new Date()
            };

            let result;
            
            if (existingSettings.length > 0) {
                // Update existing settings
                result = await smartAttendanceCollection.updateOne(
                    { _id: existingSettings[0]._id },
                    { $set: settingsData }
                );
            } else {
                // Create new settings
                settingsData.createdAt = new Date();
                result = await smartAttendanceCollection.insertOne(settingsData);
            }

            res.json({
                success: true,
                message: 'Smart attendance settings saved successfully',
                data: result
            });

        } catch (error) {
            console.error('Error saving smart attendance settings:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to save smart attendance settings'
            });
        }
    });

    // PUT update smart attendance settings
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid settings ID'
                });
            }

            updateData.updatedAt = new Date();

            const result = await smartAttendanceCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Smart attendance settings not found'
                });
            }

            res.json({
                success: true,
                message: 'Smart attendance settings updated successfully'
            });

        } catch (error) {
            console.error('Error updating smart attendance settings:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update smart attendance settings'
            });
        }
    });

    // DELETE smart attendance settings
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid settings ID'
                });
            }

            const result = await smartAttendanceCollection.deleteOne({ 
                _id: new ObjectId(id) 
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Smart attendance settings not found'
                });
            }

            res.json({
                success: true,
                message: 'Smart attendance settings deleted successfully'
            });

        } catch (error) {
            console.error('Error deleting smart attendance settings:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete smart attendance settings'
            });
        }
    });

    return router;
};