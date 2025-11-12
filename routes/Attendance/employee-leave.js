const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (employeeLeaveCollection) => {

    // Get all employee leave applications with filters
    router.get('/', async (req, res) => {
        try {
            const { employeeId, status, leaveType } = req.query;
            
            let filter = { isActive: true };
            
            if (employeeId) {
                filter.employeeId = employeeId;
            }
            
            if (status) {
                filter.status = status;
            }

            if (leaveType) {
                filter.leaveType = leaveType;
            }

            // First check if collection has any documents
            const collectionExists = await employeeLeaveCollection.countDocuments();
            
            if (collectionExists === 0) {
                return res.status(200).json({
                    success: true,
                    message: 'No employee leave applications found',
                    data: []
                });
            }

            const leaveApplications = await employeeLeaveCollection.aggregate([
                {
                    $match: filter
                },
                {
                    $sort: { appliedAt: -1 }
                }
            ]).toArray();

            res.status(200).json({
                success: true,
                message: 'Employee leave applications fetched successfully',
                data: leaveApplications
            });
        } catch (error) {
            console.error('Error fetching employee leave applications:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch employee leave applications',
                error: error.message
            });
        }
    });

    // Create new employee leave application
    router.post('/', async (req, res) => {
        try {
            const { 
                employeeName,
                employeeId,
                designation,
                department,
                startDate, 
                endDate, 
                reason,
                leaveType = 'casual',
                contactNumber,
                address
            } = req.body;

            // Validation
            if (!employeeName || !employeeName.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Employee name is required'
                });
            }

            if (!employeeId || !employeeId.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Employee ID is required'
                });
            }

            if (!designation || !designation.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Designation is required'
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

            // Check if employee ID already exists for pending applications
            const existingApplication = await employeeLeaveCollection.findOne({
                employeeId: employeeId.trim(),
                status: 'pending',
                isActive: true
            });

            if (existingApplication) {
                return res.status(400).json({
                    success: false,
                    message: 'You already have a pending leave application'
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
                employeeName: employeeName.trim(),
                employeeId: employeeId.trim(),
                designation: designation.trim(),
                department: department?.trim() || 'General',
                contactNumber: contactNumber?.trim() || '',
                address: address?.trim() || '',
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                totalDays: totalDays,
                reason: reason.trim(),
                leaveType: leaveType,
                status: 'pending', // pending, approved, rejected
                appliedAt: new Date(),
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await employeeLeaveCollection.insertOne(leaveApplication);
            const savedApplication = { ...leaveApplication, _id: result.insertedId };

            res.status(201).json({
                success: true,
                message: 'Employee leave application submitted successfully',
                data: savedApplication
            });
        } catch (error) {
            console.error('Error creating employee leave application:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to submit employee leave application',
                error: error.message
            });
        }
    });

    // Update employee leave application status
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
            const existingApplication = await employeeLeaveCollection.findOne({ 
                _id: new ObjectId(id),
                isActive: true
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

            const result = await employeeLeaveCollection.updateOne(
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
                message: `Employee leave application ${status} successfully`,
                data: {
                    status: status
                }
            });
        } catch (error) {
            console.error('Error updating employee leave application status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update employee leave application status',
                error: error.message
            });
        }
    });

    // Delete employee leave application (soft delete)
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
            const existingApplication = await employeeLeaveCollection.findOne({ 
                _id: new ObjectId(id),
                isActive: true
            });

            if (!existingApplication) {
                return res.status(404).json({
                    success: false,
                    message: 'Leave application not found'
                });
            }

            // Soft delete by setting isActive to false
            const result = await employeeLeaveCollection.updateOne(
                { _id: new ObjectId(id) },
                { 
                    $set: { 
                        isActive: false, 
                        updatedAt: new Date() 
                    } 
                }
            );

            if (result.modifiedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Leave application not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Employee leave application deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting employee leave application:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete employee leave application',
                error: error.message
            });
        }
    });

    // Get employee leave application by ID
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

            const leaveApplication = await employeeLeaveCollection.findOne({
                _id: new ObjectId(id),
                isActive: true
            });

            if (!leaveApplication) {
                return res.status(404).json({
                    success: false,
                    message: 'Employee leave application not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Employee leave application fetched successfully',
                data: leaveApplication
            });
        } catch (error) {
            console.error('Error fetching employee leave application:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch employee leave application',
                error: error.message
            });
        }
    });

    // Update employee leave application
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { 
                employeeName,
                designation,
                department,
                startDate, 
                endDate, 
                reason,
                leaveType,
                contactNumber,
                address
            } = req.body;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid leave application ID'
                });
            }

            // Check if leave application exists
            const existingApplication = await employeeLeaveCollection.findOne({ 
                _id: new ObjectId(id),
                isActive: true
            });

            if (!existingApplication) {
                return res.status(404).json({
                    success: false,
                    message: 'Leave application not found'
                });
            }

            // Validation
            if (!employeeName || !employeeName.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Employee name is required'
                });
            }

            if (!designation || !designation.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Designation is required'
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

            const updateData = {
                employeeName: employeeName.trim(),
                designation: designation.trim(),
                department: department?.trim() || 'General',
                contactNumber: contactNumber?.trim() || '',
                address: address?.trim() || '',
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                totalDays: totalDays,
                reason: reason.trim(),
                leaveType: leaveType,
                updatedAt: new Date()
            };

            const result = await employeeLeaveCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.modifiedCount === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Failed to update leave application'
                });
            }

            const updatedApplication = await employeeLeaveCollection.findOne({
                _id: new ObjectId(id)
            });

            res.status(200).json({
                success: true,
                message: 'Employee leave application updated successfully',
                data: updatedApplication
            });
        } catch (error) {
            console.error('Error updating employee leave application:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update employee leave application',
                error: error.message
            });
        }
    });

    // Get leave statistics
    router.get('/stats/summary', async (req, res) => {
        try {
            const stats = await employeeLeaveCollection.aggregate([
                {
                    $match: { isActive: true }
                },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        totalDays: { $sum: '$totalDays' }
                    }
                }
            ]).toArray();

            const totalApplications = await employeeLeaveCollection.countDocuments({ isActive: true });
            const pendingCount = stats.find(s => s._id === 'pending')?.count || 0;
            const approvedCount = stats.find(s => s._id === 'approved')?.count || 0;
            const rejectedCount = stats.find(s => s._id === 'rejected')?.count || 0;

            res.status(200).json({
                success: true,
                message: 'Leave statistics fetched successfully',
                data: {
                    totalApplications,
                    pending: pendingCount,
                    approved: approvedCount,
                    rejected: rejectedCount,
                    stats: stats
                }
            });
        } catch (error) {
            console.error('Error fetching leave statistics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch leave statistics',
                error: error.message
            });
        }
    });

    return router;
};