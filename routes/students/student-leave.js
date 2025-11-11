const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (studentLeaveCollection, studentsCollection) => {

    // Get all leave applications with filters
    router.get('/', async (req, res) => {
        try {
            const { studentId, classId, status } = req.query;
            
            let filter = {};
            
            if (studentId) {
                filter.studentId = studentId;
            }
            
            if (classId) {
                filter.classId = new ObjectId(classId);
            }
            
            if (status) {
                filter.status = status;
            }

            const leaveApplications = await studentLeaveCollection.aggregate([
                {
                    $match: filter
                },
                {
                    $lookup: {
                        from: 'students',
                        localField: 'studentId',
                        foreignField: '_id',
                        as: 'student'
                    }
                },
                {
                    $lookup: {
                        from: 'classes',
                        localField: 'classId',
                        foreignField: '_id',
                        as: 'class'
                    }
                },
                {
                    $unwind: {
                        path: '$student',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $unwind: {
                        path: '$class',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        _id: 1,
                        studentId: 1,
                        'student.name': 1,
                        'student.studentId': 1,
                        'student.photo': 1,
                        'class.name': 1,
                        startDate: 1,
                        endDate: 1,
                        totalDays: 1,
                        reason: 1,
                        status: 1,
                        appliedAt: 1,
                        approvedAt: 1,
                        rejectedAt: 1
                    }
                },
                {
                    $sort: { appliedAt: -1 }
                }
            ]).toArray();

            res.status(200).json({
                success: true,
                message: 'Leave applications fetched successfully',
                data: leaveApplications
            });
        } catch (error) {
            console.error('Error fetching leave applications:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch leave applications',
                error: error.message
            });
        }
    });

    // Create new leave application
    router.post('/', async (req, res) => {
        try {
            const { 
                studentId, 
                classId, 
                startDate, 
                endDate, 
                reason 
            } = req.body;

            // Validation
            if (!studentId) {
                return res.status(400).json({
                    success: false,
                    message: 'Student ID is required'
                });
            }

            if (!classId) {
                return res.status(400).json({
                    success: false,
                    message: 'Class is required'
                });
            }

            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Start date and end date are required'
                });
            }

            if (!reason || reason.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Reason is required'
                });
            }

            // Check if student exists
            const student = await studentsCollection.findOne({ 
                _id: new ObjectId(studentId) 
            });

            if (!student) {
                return res.status(404).json({
                    success: false,
                    message: 'Student not found'
                });
            }

            // Calculate total days
            const start = new Date(startDate);
            const end = new Date(endDate);
            const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

            if (totalDays <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'End date must be after start date'
                });
            }

            const leaveApplication = {
                studentId: new ObjectId(studentId),
                classId: new ObjectId(classId),
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                totalDays: totalDays,
                reason: reason.trim(),
                status: 'pending', // pending, approved, rejected
                appliedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await studentLeaveCollection.insertOne(leaveApplication);

            res.status(201).json({
                success: true,
                message: 'Leave application submitted successfully',
                data: {
                    _id: result.insertedId,
                    ...leaveApplication
                }
            });
        } catch (error) {
            console.error('Error creating leave application:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to submit leave application',
                error: error.message
            });
        }
    });

    // Update leave application status
    router.patch('/:id/status', async (req, res) => {
        try {
            const { id } = req.params;
            const { status, remarks } = req.body;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid leave application ID'
                });
            }

            // Validate status
            const validStatuses = ['pending', 'approved', 'rejected'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status. Must be: pending, approved, or rejected'
                });
            }

            // Check if leave application exists
            const existingApplication = await studentLeaveCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingApplication) {
                return res.status(404).json({
                    success: false,
                    message: 'Leave application not found'
                });
            }

            const updateData = {
                status: status,
                updatedAt: new Date()
            };

            // Add timestamp based on status
            if (status === 'approved') {
                updateData.approvedAt = new Date();
                updateData.approvedRemarks = remarks;
            } else if (status === 'rejected') {
                updateData.rejectedAt = new Date();
                updateData.rejectionRemarks = remarks;
            }

            const result = await studentLeaveCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.modifiedCount === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Failed to update leave application status'
                });
            }

            res.status(200).json({
                success: true,
                message: `Leave application ${status} successfully`,
                data: {
                    status: status
                }
            });
        } catch (error) {
            console.error('Error updating leave application status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update leave application status',
                error: error.message
            });
        }
    });

    // Delete leave application
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid leave application ID'
                });
            }

            // Check if leave application exists
            const existingApplication = await studentLeaveCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingApplication) {
                return res.status(404).json({
                    success: false,
                    message: 'Leave application not found'
                });
            }

            const result = await studentLeaveCollection.deleteOne({ 
                _id: new ObjectId(id) 
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Leave application not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Leave application deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting leave application:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete leave application',
                error: error.message
            });
        }
    });

    // Get leave application by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid leave application ID'
                });
            }

            const leaveApplication = await studentLeaveCollection.aggregate([
                {
                    $match: { _id: new ObjectId(id) }
                },
                {
                    $lookup: {
                        from: 'students',
                        localField: 'studentId',
                        foreignField: '_id',
                        as: 'student'
                    }
                },
                {
                    $lookup: {
                        from: 'classes',
                        localField: 'classId',
                        foreignField: '_id',
                        as: 'class'
                    }
                },
                {
                    $unwind: '$student'
                },
                {
                    $unwind: '$class'
                }
            ]).toArray();

            if (!leaveApplication || leaveApplication.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Leave application not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Leave application fetched successfully',
                data: leaveApplication[0]
            });
        } catch (error) {
            console.error('Error fetching leave application:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch leave application',
                error: error.message
            });
        }
    });

    // Get students for dropdown
    router.get('/students/search', async (req, res) => {
        try {
            const { search, classId } = req.query;
            
            let filter = {};
            
            if (search) {
                filter.$or = [
                    { studentId: { $regex: search, $options: 'i' } },
                    { name: { $regex: search, $options: 'i' } }
                ];
            }
            
            if (classId) {
                filter.classId = new ObjectId(classId);
            }

            const students = await studentsCollection.find(filter)
                .project({
                    _id: 1,
                    studentId: 1,
                    name: 1,
                    classId: 1,
                    photo: 1
                })
                .limit(20)
                .toArray();

            res.status(200).json({
                success: true,
                message: 'Students fetched successfully',
                data: students
            });
        } catch (error) {
            console.error('Error fetching students:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch students',
                error: error.message
            });
        }
    });

    return router;
};