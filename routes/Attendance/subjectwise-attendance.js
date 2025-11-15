const express = require('express');
const router = express.Router();

module.exports = (subjectWiseCollections) => {
    
    // GET all subject-wise attendance records
    router.get('/', async (req, res) => {
        try {
            const attendanceRecords = await subjectWiseCollections.find({}).toArray();
            
            res.json({
                success: true,
                data: attendanceRecords
            });
        } catch (error) {
            console.error('Error fetching subject-wise attendance:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    });

    // POST create new subject-wise attendance record
    router.post('/', async (req, res) => {
        try {
            const {
                date,
                sessionId,
                classId,
                subjectId
            } = req.body;

            // Validation
            if (!date || !sessionId || !classId || !subjectId) {
                return res.status(400).json({
                    success: false,
                    message: 'All fields are required'
                });
            }

            // Check if attendance already exists for this combination
            const existingAttendance = await subjectWiseCollections.findOne({
                date: new Date(date),
                sessionId,
                classId,
                subjectId
            });

            if (existingAttendance) {
                return res.status(400).json({
                    success: false,
                    message: 'Attendance already exists for this date, session, class, and subject combination'
                });
            }

            const attendanceData = {
                date: new Date(date),
                sessionId,
                classId,
                subjectId,
                status: 'active',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await subjectWiseCollections.insertOne(attendanceData);

            if (result.acknowledged) {
                res.json({
                    success: true,
                    message: 'Subject-wise attendance created successfully',
                    data: {
                        id: result.insertedId,
                        ...attendanceData
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to create attendance record'
                });
            }
        } catch (error) {
            console.error('Error creating subject-wise attendance:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    });

    // GET attendance by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const attendance = await subjectWiseCollections.findOne({ _id: new ObjectId(id) });
            
            if (!attendance) {
                return res.status(404).json({
                    success: false,
                    message: 'Attendance record not found'
                });
            }

            res.json({
                success: true,
                data: attendance
            });
        } catch (error) {
            console.error('Error fetching attendance by ID:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    });

    // PUT update attendance record
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = {
                ...req.body,
                updatedAt: new Date()
            };

            // Convert date to Date object if present
            if (updateData.date) {
                updateData.date = new Date(updateData.date);
            }

            const result = await subjectWiseCollections.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.modifiedCount > 0) {
                res.json({
                    success: true,
                    message: 'Attendance record updated successfully'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Attendance record not found'
                });
            }
        } catch (error) {
            console.error('Error updating attendance record:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    });

    // DELETE attendance record
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const result = await subjectWiseCollections.deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount > 0) {
                res.json({
                    success: true,
                    message: 'Attendance record deleted successfully'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Attendance record not found'
                });
            }
        } catch (error) {
            console.error('Error deleting attendance record:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    });

    // GET attendance by filters (date, session, class, subject)
    router.get('/filter/records', async (req, res) => {
        try {
            const { date, sessionId, classId, subjectId } = req.query;
            
            const filter = {};
            if (date) filter.date = new Date(date);
            if (sessionId) filter.sessionId = sessionId;
            if (classId) filter.classId = classId;
            if (subjectId) filter.subjectId = subjectId;

            const attendanceRecords = await subjectWiseCollections.find(filter).toArray();

            res.json({
                success: true,
                data: attendanceRecords
            });
        } catch (error) {
            console.error('Error filtering attendance records:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    });

    return router;
};