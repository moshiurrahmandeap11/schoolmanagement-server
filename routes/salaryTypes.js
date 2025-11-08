const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (salaryTypesCollection) => {

    // GET all salary types
    router.get('/', async (req, res) => {
        try {
            const salaryTypes = await salaryTypesCollection.find({}).toArray();
            res.json({
                success: true,
                data: salaryTypes,
                count: salaryTypes.length
            });
        } catch (error) {
            console.error('Error fetching salary types:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch salary types'
            });
        }
    });

    // GET single salary type by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const salaryType = await salaryTypesCollection.findOne({ _id: new ObjectId(id) });

            if (!salaryType) {
                return res.status(404).json({
                    success: false,
                    message: 'Salary type not found'
                });
            }

            res.json({
                success: true,
                data: salaryType
            });
        } catch (error) {
            console.error('Error fetching salary type:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch salary type'
            });
        }
    });

    // CREATE new salary type
    router.post('/', async (req, res) => {
        try {
            const { 
                salaryName, 
                amount, 
                isMonthly, 
                applicableFrom, 
                applicableTo, 
                description, 
                session 
            } = req.body;

            // Validation
            if (!salaryName || !amount || !applicableFrom || !session) {
                return res.status(400).json({
                    success: false,
                    message: 'Salary name, amount, applicable from date, and session are required fields'
                });
            }

            // Check if salary type already exists for this session
            const existingSalaryType = await salaryTypesCollection.findOne({ 
                salaryName: new RegExp(salaryName, 'i'),
                session 
            });

            if (existingSalaryType) {
                return res.status(400).json({
                    success: false,
                    message: 'A salary type with this name already exists for the selected session'
                });
            }

            const newSalaryType = {
                salaryName: salaryName.trim(),
                amount: parseFloat(amount),
                isMonthly: Boolean(isMonthly),
                applicableFrom: new Date(applicableFrom),
                applicableTo: applicableTo ? new Date(applicableTo) : null,
                description: description || '',
                session: session.trim(),
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await salaryTypesCollection.insertOne(newSalaryType);

            if (result.insertedId) {
                const createdSalaryType = await salaryTypesCollection.findOne({ _id: result.insertedId });
                res.status(201).json({
                    success: true,
                    message: 'Salary type created successfully',
                    data: createdSalaryType
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to create salary type'
                });
            }
        } catch (error) {
            console.error('Error creating salary type:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create salary type'
            });
        }
    });

    // UPDATE salary type
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { 
                salaryName, 
                amount, 
                isMonthly, 
                applicableFrom, 
                applicableTo, 
                description, 
                session,
                isActive 
            } = req.body;

            // Validation
            if (!salaryName || !amount || !applicableFrom || !session) {
                return res.status(400).json({
                    success: false,
                    message: 'Salary name, amount, applicable from date, and session are required fields'
                });
            }

            // Check if salary type already exists for other records
            const existingSalaryType = await salaryTypesCollection.findOne({ 
                salaryName: new RegExp(salaryName, 'i'),
                session,
                _id: { $ne: new ObjectId(id) }
            });

            if (existingSalaryType) {
                return res.status(400).json({
                    success: false,
                    message: 'A salary type with this name already exists for the selected session'
                });
            }

            const updateData = {
                salaryName: salaryName.trim(),
                amount: parseFloat(amount),
                isMonthly: Boolean(isMonthly),
                applicableFrom: new Date(applicableFrom),
                applicableTo: applicableTo ? new Date(applicableTo) : null,
                description: description || '',
                session: session.trim(),
                isActive: isActive !== undefined ? Boolean(isActive) : true,
                updatedAt: new Date()
            };

            const result = await salaryTypesCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.modifiedCount > 0) {
                const updatedSalaryType = await salaryTypesCollection.findOne({ _id: new ObjectId(id) });
                res.json({
                    success: true,
                    message: 'Salary type updated successfully',
                    data: updatedSalaryType
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Salary type not found or no changes made'
                });
            }
        } catch (error) {
            console.error('Error updating salary type:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update salary type'
            });
        }
    });

    // DELETE salary type
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            const result = await salaryTypesCollection.deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount > 0) {
                res.json({
                    success: true,
                    message: 'Salary type deleted successfully'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Salary type not found'
                });
            }
        } catch (error) {
            console.error('Error deleting salary type:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete salary type'
            });
        }
    });

    // GET salary types by session
    router.get('/session/:session', async (req, res) => {
        try {
            const { session } = req.params;
            const salaryTypes = await salaryTypesCollection.find({ 
                session: new RegExp(session, 'i') 
            }).toArray();

            res.json({
                success: true,
                data: salaryTypes,
                count: salaryTypes.length
            });
        } catch (error) {
            console.error('Error fetching salary types by session:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch salary types by session'
            });
        }
    });

    // TOGGLE salary type status
    router.patch('/:id/toggle', async (req, res) => {
        try {
            const salaryType = await salaryTypesCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!salaryType) {
                return res.status(404).json({
                    success: false,
                    message: 'Salary type not found'
                });
            }

            const result = await salaryTypesCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { 
                    $set: { 
                        isActive: !salaryType.isActive,
                        updatedAt: new Date()
                    } 
                }
            );

            res.json({
                success: true,
                message: `Salary type ${!salaryType.isActive ? 'activated' : 'deactivated'} successfully`,
                data: {
                    isActive: !salaryType.isActive
                }
            });
        } catch (error) {
            console.error('Error toggling salary type status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to toggle salary type status'
            });
        }
    });

    return router;
};