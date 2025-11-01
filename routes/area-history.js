// Backend Route (areaHistory.js)
const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

module.exports = (areaHistoryCollection) => {

    // GET upazilla data
    router.get('/upazilla', async (req, res) => {
        try {
            const upazillaData = await areaHistoryCollection.findOne({ type: 'upazilla' });
            
            res.json({
                success: true,
                data: upazillaData
            });
        } catch (error) {
            console.error('Error fetching upazilla data:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch upazilla data'
            });
        }
    });

    // GET zilla data
    router.get('/zilla', async (req, res) => {
        try {
            const zillaData = await areaHistoryCollection.findOne({ type: 'zilla' });
            
            res.json({
                success: true,
                data: zillaData
            });
        } catch (error) {
            console.error('Error fetching zilla data:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch zilla data'
            });
        }
    });

    // POST create or update upazilla data
    router.post('/upazilla', async (req, res) => {
        try {
            const { googleMapLocation, description } = req.body;

            if (!googleMapLocation || !description) {
                return res.status(400).json({
                    success: false,
                    message: 'Google map location and description are required'
                });
            }

            // Check if upazilla data already exists
            const existingData = await areaHistoryCollection.findOne({ type: 'upazilla' });

            if (existingData) {
                // Update existing data
                const result = await areaHistoryCollection.updateOne(
                    { type: 'upazilla' },
                    { 
                        $set: { 
                            googleMapLocation,
                            description,
                            updatedAt: new Date()
                        } 
                    }
                );

                res.json({
                    success: true,
                    message: 'Upazilla data updated successfully'
                });
            } else {
                // Create new data
                const newData = {
                    type: 'upazilla',
                    googleMapLocation,
                    description,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                const result = await areaHistoryCollection.insertOne(newData);

                res.json({
                    success: true,
                    message: 'Upazilla data created successfully',
                    data: { ...newData, _id: result.insertedId }
                });
            }
        } catch (error) {
            console.error('Error saving upazilla data:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to save upazilla data'
            });
        }
    });

    // POST create or update zilla data
    router.post('/zilla', async (req, res) => {
        try {
            const { googleMapLocation, description } = req.body;

            if (!googleMapLocation || !description) {
                return res.status(400).json({
                    success: false,
                    message: 'Google map location and description are required'
                });
            }

            // Check if zilla data already exists
            const existingData = await areaHistoryCollection.findOne({ type: 'zilla' });

            if (existingData) {
                // Update existing data
                const result = await areaHistoryCollection.updateOne(
                    { type: 'zilla' },
                    { 
                        $set: { 
                            googleMapLocation,
                            description,
                            updatedAt: new Date()
                        } 
                    }
                );

                res.json({
                    success: true,
                    message: 'Zilla data updated successfully'
                });
            } else {
                // Create new data
                const newData = {
                    type: 'zilla',
                    googleMapLocation,
                    description,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                const result = await areaHistoryCollection.insertOne(newData);

                res.json({
                    success: true,
                    message: 'Zilla data created successfully',
                    data: { ...newData, _id: result.insertedId }
                });
            }
        } catch (error) {
            console.error('Error saving zilla data:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to save zilla data'
            });
        }
    });

    // PUT update upazilla data by ID
router.put('/upazilla/:id', async (req, res) => {
    try {
        const { googleMapLocation, description } = req.body;
        const { id } = req.params;

        if (!googleMapLocation || !description) {
            return res.status(400).json({
                success: false,
                message: 'Google map location and description are required'
            });
        }

        const result = await areaHistoryCollection.updateOne(
            { _id: new ObjectId(id), type: 'upazilla' }, // ✅ Convert string ID to ObjectId
            { 
                $set: { 
                    googleMapLocation,
                    description,
                    updatedAt: new Date()
                } 
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Upazilla data not found'
            });
        }

        res.json({
            success: true,
            message: 'Upazilla data updated successfully'
        });
    } catch (error) {
        console.error('Error updating upazilla data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update upazilla data'
        });
    }
});

    // PUT update zilla data by ID
    router.put('/zilla/:id', async (req, res) => {
        try {
            const { googleMapLocation, description } = req.body;

            if (!googleMapLocation || !description) {
                return res.status(400).json({
                    success: false,
                    message: 'Google map location and description are required'
                });
            }

            const result = await areaHistoryCollection.updateOne(
                { _id: req.params.id, type: 'zilla' },
                { 
                    $set: { 
                        googleMapLocation,
                        description,
                        updatedAt: new Date()
                    } 
                }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Zilla data not found'
                });
            }

            res.json({
                success: true,
                message: 'Zilla data updated successfully'
            });
        } catch (error) {
            console.error('Error updating zilla data:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update zilla data'
            });
        }
    });

    return router;
};