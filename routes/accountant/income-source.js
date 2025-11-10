const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (incomeSourceCollection) => {

    // GET all income sources
    router.get('/', async (req, res) => {
        try {
            const incomeSources = await incomeSourceCollection.find({}).sort({ createdAt: -1 }).toArray();
            
            res.json({
                success: true,
                data: incomeSources,
                total: incomeSources.length,
                message: 'Income sources fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching income sources:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching income sources',
                error: error.message
            });
        }
    });

    // GET single income source by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid income source ID'
                });
            }

            const incomeSource = await incomeSourceCollection.findOne({ _id: new ObjectId(id) });
            
            if (!incomeSource) {
                return res.status(404).json({
                    success: false,
                    message: 'Income source not found'
                });
            }

            res.json({
                success: true,
                data: incomeSource,
                message: 'Income source fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching income source:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching income source',
                error: error.message
            });
        }
    });

    // CREATE new income source
    router.post('/', async (req, res) => {
        try {
            const { name, description } = req.body;

            // Validation
            if (!name || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Income source name is required'
                });
            }

            // Check if income source already exists
            const existingSource = await incomeSourceCollection.findOne({ 
                name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
            });

            if (existingSource) {
                return res.status(400).json({
                    success: false,
                    message: 'Income source already exists'
                });
            }

            const newIncomeSource = {
                name: name.trim(),
                description: description?.trim() || '',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await incomeSourceCollection.insertOne(newIncomeSource);
            
            res.status(201).json({
                success: true,
                message: 'Income source created successfully',
                data: {
                    _id: result.insertedId,
                    ...newIncomeSource
                }
            });
        } catch (error) {
            console.error('Error creating income source:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating income source',
                error: error.message
            });
        }
    });

    // CREATE multiple income sources
    router.post('/bulk', async (req, res) => {
        try {
            const { incomeSources } = req.body;

            if (!incomeSources || !Array.isArray(incomeSources) || incomeSources.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Income sources array is required'
                });
            }

            const validSources = incomeSources.filter(source => source.name && source.name.trim());
            
            if (validSources.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No valid income sources provided'
                });
            }

            // Check for duplicates in the request
            const names = validSources.map(source => source.name.trim().toLowerCase());
            const uniqueNames = [...new Set(names)];
            
            if (names.length !== uniqueNames.length) {
                return res.status(400).json({
                    success: false,
                    message: 'Duplicate income source names in request'
                });
            }

            // Check for existing income sources
            const existingSources = await incomeSourceCollection.find({
                name: { $in: uniqueNames.map(name => new RegExp(`^${name}$`, 'i')) }
            }).toArray();

            if (existingSources.length > 0) {
                const existingNames = existingSources.map(source => source.name);
                return res.status(400).json({
                    success: false,
                    message: `Some income sources already exist: ${existingNames.join(', ')}`
                });
            }

            const sourcesToInsert = validSources.map(source => ({
                name: source.name.trim(),
                description: source.description?.trim() || '',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            }));

            const result = await incomeSourceCollection.insertMany(sourcesToInsert);
            
            res.status(201).json({
                success: true,
                message: `${sourcesToInsert.length} income sources created successfully`,
                data: {
                    insertedCount: result.insertedCount,
                    incomeSources: sourcesToInsert
                }
            });
        } catch (error) {
            console.error('Error creating bulk income sources:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating income sources',
                error: error.message
            });
        }
    });

    // UPDATE income source
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { name, description, isActive } = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid income source ID'
                });
            }

            // Check if income source exists
            const existingSource = await incomeSourceCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingSource) {
                return res.status(404).json({
                    success: false,
                    message: 'Income source not found'
                });
            }

            // Check if name already exists (excluding current source)
            if (name && name !== existingSource.name) {
                const duplicateSource = await incomeSourceCollection.findOne({ 
                    name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
                    _id: { $ne: new ObjectId(id) }
                });

                if (duplicateSource) {
                    return res.status(400).json({
                        success: false,
                        message: 'Income source name already exists'
                    });
                }
            }

            const updateData = {
                updatedAt: new Date()
            };

            if (name !== undefined) updateData.name = name.trim();
            if (description !== undefined) updateData.description = description.trim();
            if (isActive !== undefined) updateData.isActive = Boolean(isActive);

            const result = await incomeSourceCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            res.json({
                success: true,
                message: 'Income source updated successfully',
                data: {
                    _id: id,
                    ...updateData
                }
            });
        } catch (error) {
            console.error('Error updating income source:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating income source',
                error: error.message
            });
        }
    });

    // DELETE income source
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid income source ID'
                });
            }

            const result = await incomeSourceCollection.deleteOne({ 
                _id: new ObjectId(id) 
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Income source not found'
                });
            }

            res.json({
                success: true,
                message: 'Income source deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting income source:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting income source',
                error: error.message
            });
        }
    });

    // TOGGLE income source status
    router.patch('/:id/toggle-status', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid income source ID'
                });
            }

            const incomeSource = await incomeSourceCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!incomeSource) {
                return res.status(404).json({
                    success: false,
                    message: 'Income source not found'
                });
            }

            const newStatus = !incomeSource.isActive;

            await incomeSourceCollection.updateOne(
                { _id: new ObjectId(id) },
                { 
                    $set: { 
                        isActive: newStatus,
                        updatedAt: new Date() 
                    } 
                }
            );

            res.json({
                success: true,
                message: `Income source ${newStatus ? 'activated' : 'deactivated'} successfully`,
                data: {
                    isActive: newStatus
                }
            });
        } catch (error) {
            console.error('Error toggling income source status:', error);
            res.status(500).json({
                success: false,
                message: 'Error toggling income source status',
                error: error.message
            });
        }
    });

    return router;
};