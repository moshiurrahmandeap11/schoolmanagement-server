const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (smartAttendanceShiftCollection) => {

    // GET all attendance shifts
    router.get('/', async (req, res) => {
        try {
            const shifts = await smartAttendanceShiftCollection
                .aggregate([
                    {
                        $lookup: {
                            from: 'classes',
                            localField: 'class',
                            foreignField: '_id',
                            as: 'class'
                        }
                    },
                    {
                        $unwind: {
                            path: '$class',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $lookup: {
                            from: 'sections',
                            localField: 'section',
                            foreignField: '_id',
                            as: 'section'
                        }
                    },
                    {
                        $unwind: {
                            path: '$section',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $sort: { createdAt: -1 }
                    }
                ])
                .toArray();

            res.json({
                success: true,
                data: shifts,
                message: 'Attendance shifts fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching attendance shifts:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch attendance shifts'
            });
        }
    });

    // POST new attendance shift
    router.post('/', async (req, res) => {
        try {
            const {
                shiftName,
                class: classId,
                section: sectionId,
                studentEntryTime,
                studentExitTime,
                // Teacher specific fields
                teacherEntryTime,
                teacherExitTime,
                countLateAfter,
                countEarlyExitBefore,
                timezone,
                sendSms,
                smsType,
                absentAfter,
                instituteShortName,
                enableAbsentSms,
                sendSmsTo
            } = req.body;

            // Validation
            if (!shiftName || !shiftName.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Shift name is required'
                });
            }

            // For teacher settings, class is not required
            if (!teacherEntryTime && !studentEntryTime) {
                return res.status(400).json({
                    success: false,
                    message: 'Either student or teacher entry time is required'
                });
            }

            if (sendSms && !smsType) {
                return res.status(400).json({
                    success: false,
                    message: 'SMS type is required when SMS is enabled'
                });
            }

            // Check if shift name already exists
            const existingShift = await smartAttendanceShiftCollection.findOne({
                shiftName: shiftName.trim()
            });

            if (existingShift) {
                return res.status(400).json({
                    success: false,
                    message: 'Shift name already exists'
                });
            }

            const shiftData = {
                shiftName: shiftName.trim(),
                class: classId ? new ObjectId(classId) : null,
                section: sectionId ? new ObjectId(sectionId) : null,
                studentEntryTime: studentEntryTime || '',
                studentExitTime: studentExitTime || '',
                // Teacher specific fields
                teacherEntryTime: teacherEntryTime || '',
                teacherExitTime: teacherExitTime || '',
                countLateAfter: countLateAfter || 0,
                countEarlyExitBefore: countEarlyExitBefore || 0,
                timezone: timezone || 'Asia/Dhaka',
                sendSms: sendSms || false,
                smsType: sendSms ? smsType : null,
                absentAfter: absentAfter || null,
                instituteShortName: instituteShortName || '',
                enableAbsentSms: enableAbsentSms || false,
                sendSmsTo: sendSmsTo || 'to_institute',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await smartAttendanceShiftCollection.insertOne(shiftData);

            res.json({
                success: true,
                message: 'Attendance shift created successfully',
                data: result
            });

        } catch (error) {
            console.error('Error creating attendance shift:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create attendance shift'
            });
        }
    });

    // PUT update attendance shift
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid shift ID'
                });
            }

            if (updateData.shiftName) {
                updateData.shiftName = updateData.shiftName.trim();
            }

            updateData.updatedAt = new Date();

            const result = await smartAttendanceShiftCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Attendance shift not found'
                });
            }

            res.json({
                success: true,
                message: 'Attendance shift updated successfully'
            });

        } catch (error) {
            console.error('Error updating attendance shift:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update attendance shift'
            });
        }
    });

    // DELETE attendance shift
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid shift ID'
                });
            }

            const result = await smartAttendanceShiftCollection.deleteOne({ 
                _id: new ObjectId(id) 
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Attendance shift not found'
                });
            }

            res.json({
                success: true,
                message: 'Attendance shift deleted successfully'
            });

        } catch (error) {
            console.error('Error deleting attendance shift:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete attendance shift'
            });
        }
    });

    // POST send SMS for shift
    router.post('/:id/send-sms', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid shift ID'
                });
            }

            const shift = await smartAttendanceShiftCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!shift) {
                return res.status(404).json({
                    success: false,
                    message: 'Attendance shift not found'
                });
            }

            if (!shift.sendSms) {
                return res.status(400).json({
                    success: false,
                    message: 'SMS is not enabled for this shift'
                });
            }

            // Here you would integrate with your SMS service
            // For now, we'll just return success
            res.json({
                success: true,
                message: 'SMS sent successfully for the shift'
            });

        } catch (error) {
            console.error('Error sending SMS for shift:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to send SMS for shift'
            });
        }
    });

    return router;
};