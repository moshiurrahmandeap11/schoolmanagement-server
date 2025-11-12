const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

module.exports = (holidayTypeCollection) => {

    // Get all holiday types
    router.get('/', async (req, res) => {
        try {
            const holidayTypes = await holidayTypeCollection.find({ isActive: true })
                .sort({ createdAt: -1 })
                .toArray();

            res.json({
                success: true,
                data: holidayTypes,
                message: 'Holiday types fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching holiday types:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching holiday types'
            });
        }
    });

    // Get holiday type by ID
    router.get('/:id', async (req, res) => {
        try {
            if (!ObjectId.isValid(req.params.id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid holiday type ID'
                });
            }

            const holidayType = await holidayTypeCollection.findOne({ 
                _id: new ObjectId(req.params.id),
                isActive: true
            });

            if (!holidayType) {
                return res.status(404).json({
                    success: false,
                    message: 'Holiday type not found'
                });
            }

            res.json({
                success: true,
                data: holidayType,
                message: 'Holiday type fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching holiday type:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching holiday type'
            });
        }
    });

    // Create new holiday type
    router.post('/', async (req, res) => {
        try {
            const { name } = req.body;

            // Validation
            if (!name || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Holiday type name is required'
                });
            }

            // Check if holiday type already exists
            const existingHolidayType = await holidayTypeCollection.findOne({
                name: name.trim(),
                isActive: true
            });

            if (existingHolidayType) {
                return res.status(400).json({
                    success: false,
                    message: 'Holiday type with this name already exists'
                });
            }

            const newHolidayType = {
                name: name.trim(),
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await holidayTypeCollection.insertOne(newHolidayType);
            const savedHolidayType = { ...newHolidayType, _id: result.insertedId };

            res.status(201).json({
                success: true,
                data: savedHolidayType,
                message: 'Holiday type created successfully'
            });
        } catch (error) {
            console.error('Error creating holiday type:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while creating holiday type'
            });
        }
    });

    // Update holiday type
    router.put('/:id', async (req, res) => {
        try {
            const { name } = req.body;

            if (!ObjectId.isValid(req.params.id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid holiday type ID'
                });
            }

            // Validation
            if (!name || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Holiday type name is required'
                });
            }

            // Check if holiday type exists
            const existingHolidayType = await holidayTypeCollection.findOne({ 
                _id: new ObjectId(req.params.id),
                isActive: true
            });

            if (!existingHolidayType) {
                return res.status(404).json({
                    success: false,
                    message: 'Holiday type not found'
                });
            }

            // Check if another holiday type with same name exists
            const duplicateHolidayType = await holidayTypeCollection.findOne({
                name: name.trim(),
                _id: { $ne: new ObjectId(req.params.id) },
                isActive: true
            });

            if (duplicateHolidayType) {
                return res.status(400).json({
                    success: false,
                    message: 'Another holiday type with this name already exists'
                });
            }

            const updatedHolidayType = {
                name: name.trim(),
                updatedAt: new Date()
            };

            const result = await holidayTypeCollection.findOneAndUpdate(
                { _id: new ObjectId(req.params.id) },
                { $set: updatedHolidayType },
                { returnDocument: 'after' }
            );

            res.json({
                success: true,
                data: result.value,
                message: 'Holiday type updated successfully'
            });
        } catch (error) {
            console.error('Error updating holiday type:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while updating holiday type'
            });
        }
    });

    // Delete holiday type (soft delete)
    router.delete('/:id', async (req, res) => {
        try {
            if (!ObjectId.isValid(req.params.id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid holiday type ID'
                });
            }

            const result = await holidayTypeCollection.findOneAndUpdate(
                { _id: new ObjectId(req.params.id) },
                { $set: { isActive: false, updatedAt: new Date() } },
                { returnDocument: 'after' }
            );

            if (!result.value) {
                return res.status(404).json({
                    success: false,
                    message: 'Holiday type not found'
                });
            }

            res.json({
                success: true,
                message: 'Holiday type deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting holiday type:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while deleting holiday type'
            });
        }
    });

    return router;
};