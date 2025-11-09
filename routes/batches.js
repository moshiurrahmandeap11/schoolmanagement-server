const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (batchesCollection, classesCollection) => {

    // GET all batches with class information
    router.get('/', async (req, res) => {
        try {
            const batches = await batchesCollection.aggregate([
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
                        path: '$class',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        name: 1,
                        batchId: 1,
                        classId: 1,
                        description: 1,
                        isActive: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        'class.name': 1
                    }
                },
                {
                    $sort: { createdAt: -1 }
                }
            ]).toArray();
            
            res.json({
                success: true,
                data: batches,
                message: 'Batches fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching batches:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching batches',
                error: error.message
            });
        }
    });

    // GET single batch by ID
    router.get('/:id', async (req, res) => {
        try {
            const batch = await batchesCollection.aggregate([
                {
                    $match: { _id: new ObjectId(req.params.id) }
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
                        path: '$class',
                        preserveNullAndEmptyArrays: true
                    }
                }
            ]).toArray();

            if (!batch || batch.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Batch not found'
                });
            }

            res.json({
                success: true,
                data: batch[0]
            });
        } catch (error) {
            console.error('Error fetching batch:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching batch',
                error: error.message
            });
        }
    });

    // CREATE new batch
    router.post('/', async (req, res) => {
        try {
            const batchData = req.body;

            // Validation
            if (!batchData.name || !batchData.classId) {
                return res.status(400).json({
                    success: false,
                    message: 'Batch name and class are required'
                });
            }

            // Check if batch name already exists for the same class
            const existingBatch = await batchesCollection.findOne({
                name: batchData.name,
                classId: new ObjectId(batchData.classId)
            });

            if (existingBatch) {
                return res.status(400).json({
                    success: false,
                    message: 'Batch name already exists for this class'
                });
            }

            // Generate batch ID
            const year = new Date().getFullYear().toString().slice(-2);
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            const batchId = `B${year}${randomNum}`;

            const newBatch = {
                name: batchData.name,
                batchId: batchId,
                classId: new ObjectId(batchData.classId),
                description: batchData.description || '',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await batchesCollection.insertOne(newBatch);
            
            res.status(201).json({
                success: true,
                message: 'Batch created successfully',
                data: {
                    _id: result.insertedId,
                    ...newBatch
                }
            });
        } catch (error) {
            console.error('Error creating batch:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating batch',
                error: error.message
            });
        }
    });

    // UPDATE batch
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const batchData = req.body;

            const existingBatch = await batchesCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingBatch) {
                return res.status(404).json({
                    success: false,
                    message: 'Batch not found'
                });
            }

            // Check if batch name already exists for the same class (excluding current batch)
            if (batchData.name !== existingBatch.name || batchData.classId !== existingBatch.classId.toString()) {
                const duplicateBatch = await batchesCollection.findOne({
                    name: batchData.name,
                    classId: new ObjectId(batchData.classId),
                    _id: { $ne: new ObjectId(id) }
                });

                if (duplicateBatch) {
                    return res.status(400).json({
                        success: false,
                        message: 'Batch name already exists for this class'
                    });
                }
            }

            const updateData = {
                name: batchData.name,
                classId: new ObjectId(batchData.classId),
                description: batchData.description || '',
                updatedAt: new Date()
            };

            const result = await batchesCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            res.json({
                success: true,
                message: 'Batch updated successfully'
            });
        } catch (error) {
            console.error('Error updating batch:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating batch',
                error: error.message
            });
        }
    });

    // DELETE batch
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const batch = await batchesCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!batch) {
                return res.status(404).json({
                    success: false,
                    message: 'Batch not found'
                });
            }

            await batchesCollection.deleteOne({ 
                _id: new ObjectId(id) 
            });

            res.json({
                success: true,
                message: 'Batch deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting batch:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting batch',
                error: error.message
            });
        }
    });

    // GET batches by class ID
    router.get('/class/:classId', async (req, res) => {
        try {
            const { classId } = req.params;

            const batches = await batchesCollection.find({
                classId: new ObjectId(classId),
                isActive: true
            }).toArray();

            res.json({
                success: true,
                data: batches
            });
        } catch (error) {
            console.error('Error fetching batches by class:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching batches',
                error: error.message
            });
        }
    });

    return router;
};