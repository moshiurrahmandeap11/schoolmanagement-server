const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (teacherLeaveCollection, teachersListCollection) => {

    // Get all teacher leave applications with filters
    router.get('/', async (req, res) => {
        try {
            const { teacherId, status } = req.query;
            
            let filter = {};
            
            if (teacherId) {
                filter.teacherId = teacherId;
            }
            
            if (status) {
                filter.status = status;
            }

            const leaveApplications = await teacherLeaveCollection.aggregate([
                {
                    $match: filter
                },
                {
                    $lookup: {
                        from: 'teacher-list',
                        localField: 'teacherId',
                        foreignField: '_id',
                        as: 'teacher'
                    }
                },
                {
                    $unwind: {
                        path: '$teacher',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        _id: 1,
                        teacherId: 1,
                        'teacher.name': 1,
                        'teacher.teacherId': 1,
                        'teacher.photo': 1,
                        'teacher.designation': 1,
                        'teacher.mobile': 1,
                        startDate: 1,
                        endDate: 1,
                        totalDays: 1,
                        reason: 1,
                        status: 1,
                        appliedAt: 1,
                        approvedAt: 1,
                        rejectedAt: 1,
                        leaveType: 1
                    }
                },
                {
                    $sort: { appliedAt: -1 }
                }
            ]).toArray();

            res.status(200).json({
                success: true,
                message: 'Teacher leave applications fetched successfully',
                data: leaveApplications
            });
        } catch (error) {
            console.error('Error fetching teacher leave applications:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch teacher leave applications',
                error: error.message
            });
        }
    });

    // Create new teacher leave application
    router.post('/', async (req, res) => {
        try {
            const { 
                teacherId, 
                startDate, 
                endDate, 
                reason,
                leaveType = 'casual'
            } = req.body;

            // Validation
            if (!teacherId) {
                return res.status(400).json({
                    success: false,
                    message: 'Teacher ID is required'
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

            // Check if teacher exists
            const teacher = await teachersListCollection.findOne({ 
                _id: new ObjectId(teacherId) 
            });

            if (!teacher) {
                return res.status(404).json({
                    success: false,
                    message: 'Teacher not found'
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
                teacherId: new ObjectId(teacherId),
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                totalDays: totalDays,
                reason: reason.trim(),
                leaveType: leaveType,
                status: 'pending', // pending, approved, rejected
                appliedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await teacherLeaveCollection.insertOne(leaveApplication);

            res.status(201).json({
                success: true,
                message: 'Teacher leave application submitted successfully',
                data: {
                    _id: result.insertedId,
                    ...leaveApplication
                }
            });
        } catch (error) {
            console.error('Error creating teacher leave application:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to submit teacher leave application',
                error: error.message
            });
        }
    });

    // Update teacher leave application status
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
            const existingApplication = await teacherLeaveCollection.findOne({ 
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

            const result = await teacherLeaveCollection.updateOne(
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
                message: `Teacher leave application ${status} successfully`,
                data: {
                    status: status
                }
            });
        } catch (error) {
            console.error('Error updating teacher leave application status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update teacher leave application status',
                error: error.message
            });
        }
    });

    // Delete teacher leave application
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
            const existingApplication = await teacherLeaveCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingApplication) {
                return res.status(404).json({
                    success: false,
                    message: 'Leave application not found'
                });
            }

            const result = await teacherLeaveCollection.deleteOne({ 
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
                message: 'Teacher leave application deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting teacher leave application:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete teacher leave application',
                error: error.message
            });
        }
    });

    // Get teacher leave application by ID
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

            const leaveApplication = await teacherLeaveCollection.aggregate([
                {
                    $match: { _id: new ObjectId(id) }
                },
                {
                    $lookup: {
                        from: 'teacher-list',
                        localField: 'teacherId',
                        foreignField: '_id',
                        as: 'teacher'
                    }
                },
                {
                    $unwind: '$teacher'
                }
            ]).toArray();

            if (!leaveApplication || leaveApplication.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Teacher leave application not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Teacher leave application fetched successfully',
                data: leaveApplication[0]
            });
        } catch (error) {
            console.error('Error fetching teacher leave application:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch teacher leave application',
                error: error.message
            });
        }
    });

    // Get teachers for dropdown
    router.get('/teachers/search', async (req, res) => {
        try {
            const { search } = req.query;
            
            let filter = {};
            
            if (search) {
                filter.$or = [
                    { teacherId: { $regex: search, $options: 'i' } },
                    { name: { $regex: search, $options: 'i' } },
                    { designation: { $regex: search, $options: 'i' } }
                ];
            }

            const teachers = await teachersListCollection.find(filter)
                .project({
                    _id: 1,
                    teacherId: 1,
                    name: 1,
                    designation: 1,
                    photo: 1,
                    mobile: 1
                })
                .limit(20)
                .toArray();

            res.status(200).json({
                success: true,
                message: 'Teachers fetched successfully',
                data: teachers
            });
        } catch (error) {
            console.error('Error fetching teachers:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch teachers',
                error: error.message
            });
        }
    });

    return router;
};