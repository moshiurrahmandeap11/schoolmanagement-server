const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (totalSeatCollection) => {

    // Get all classes with seat information
    router.get('/', async (req, res) => {
        try {
            const classes = await totalSeatCollection.find({}).toArray();
            res.json({
                success: true,
                data: classes,
                message: 'Classes retrieved successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching classes',
                error: error.message
            });
        }
    });

    // Get seat information for a specific class
    router.get('/class/:className', async (req, res) => {
        try {
            const className = req.params.className;
            const classInfo = await totalSeatCollection.findOne({ className });
            
            if (!classInfo) {
                return res.status(404).json({
                    success: false,
                    message: 'Class not found'
                });
            }

            res.json({
                success: true,
                data: classInfo,
                message: 'Class information retrieved successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching class information',
                error: error.message
            });
        }
    });

    // Add new class with seat information
    router.post('/', async (req, res) => {
        try {
            const { className, totalSeats, section, academicYear, description } = req.body;

            // Validate required fields
            if (!className || !totalSeats || !academicYear) {
                return res.status(400).json({
                    success: false,
                    message: 'Class name, total seats and academic year are required'
                });
            }

            // Check if class already exists for the academic year
            const existingClass = await totalSeatCollection.findOne({ 
                className, 
                academicYear 
            });

            if (existingClass) {
                return res.status(400).json({
                    success: false,
                    message: 'Class already exists for this academic year'
                });
            }

            const classData = {
                className,
                totalSeats: parseInt(totalSeats),
                availableSeats: parseInt(totalSeats),
                occupiedSeats: 0,
                section: section || 'A',
                academicYear,
                description: description || '',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await totalSeatCollection.insertOne(classData);

            res.status(201).json({
                success: true,
                data: { ...classData, _id: result.insertedId },
                message: 'Class added successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error adding class',
                error: error.message
            });
        }
    });

    // Update seat information for a class
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { totalSeats, section, academicYear, description } = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid class ID'
                });
            }

            const existingClass = await totalSeatCollection.findOne({ _id: new ObjectId(id) });
            if (!existingClass) {
                return res.status(404).json({
                    success: false,
                    message: 'Class not found'
                });
            }

            const updateData = {
                updatedAt: new Date()
            };

            if (totalSeats !== undefined) {
                const newTotalSeats = parseInt(totalSeats);
                const occupiedSeats = existingClass.occupiedSeats;
                
                if (newTotalSeats < occupiedSeats) {
                    return res.status(400).json({
                        success: false,
                        message: `Total seats cannot be less than occupied seats (${occupiedSeats})`
                    });
                }

                updateData.totalSeats = newTotalSeats;
                updateData.availableSeats = newTotalSeats - occupiedSeats;
            }

            if (section) updateData.section = section;
            if (academicYear) updateData.academicYear = academicYear;
            if (description !== undefined) updateData.description = description;

            const result = await totalSeatCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.modifiedCount === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No changes made'
                });
            }

            const updatedClass = await totalSeatCollection.findOne({ _id: new ObjectId(id) });

            res.json({
                success: true,
                data: updatedClass,
                message: 'Class updated successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error updating class',
                error: error.message
            });
        }
    });

    // Update occupied seats (when student is admitted)
    router.patch('/:id/occupy', async (req, res) => {
        try {
            const { id } = req.params;
            const { seats = 1 } = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid class ID'
                });
            }

            const existingClass = await totalSeatCollection.findOne({ _id: new ObjectId(id) });
            if (!existingClass) {
                return res.status(404).json({
                    success: false,
                    message: 'Class not found'
                });
            }

            const seatsToOccupy = parseInt(seats);
            const newOccupiedSeats = existingClass.occupiedSeats + seatsToOccupy;

            if (newOccupiedSeats > existingClass.totalSeats) {
                return res.status(400).json({
                    success: false,
                    message: 'Not enough available seats'
                });
            }

            const updateData = {
                occupiedSeats: newOccupiedSeats,
                availableSeats: existingClass.totalSeats - newOccupiedSeats,
                updatedAt: new Date()
            };

            await totalSeatCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            const updatedClass = await totalSeatCollection.findOne({ _id: new ObjectId(id) });

            res.json({
                success: true,
                data: updatedClass,
                message: `Successfully occupied ${seatsToOccupy} seat(s)`
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error updating occupied seats',
                error: error.message
            });
        }
    });

    // Delete a class
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid class ID'
                });
            }

            const result = await totalSeatCollection.deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Class not found'
                });
            }

            res.json({
                success: true,
                message: 'Class deleted successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error deleting class',
                error: error.message
            });
        }
    });

    // Get seat statistics
    router.get('/stats/summary', async (req, res) => {
        try {
            const classes = await totalSeatCollection.find({}).toArray();
            
            const stats = {
                totalClasses: classes.length,
                totalSeats: classes.reduce((sum, cls) => sum + cls.totalSeats, 0),
                totalOccupied: classes.reduce((sum, cls) => sum + cls.occupiedSeats, 0),
                totalAvailable: classes.reduce((sum, cls) => sum + cls.availableSeats, 0),
                classes: classes.map(cls => ({
                    className: cls.className,
                    section: cls.section,
                    totalSeats: cls.totalSeats,
                    occupiedSeats: cls.occupiedSeats,
                    availableSeats: cls.availableSeats,
                    utilization: ((cls.occupiedSeats / cls.totalSeats) * 100).toFixed(1)
                }))
            };

            res.json({
                success: true,
                data: stats,
                message: 'Statistics retrieved successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching statistics',
                error: error.message
            });
        }
    });

    return router;
};