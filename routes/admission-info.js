const express = require('express');
const router = express.Router();

module.exports = (admissionInfoCollection) => {
    
    // GET admission info
    router.get('/', async (req, res) => {
        try {
            const admissionInfo = await admissionInfoCollection.findOne({});
            res.json({
                success: true,
                data: admissionInfo || null
            });
        } catch (error) {
            console.error('Error fetching admission info:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch admission information'
            });
        }
    });

    // CREATE or UPDATE admission info
    router.post('/', async (req, res) => {
        try {
            const { content } = req.body;

            if (!content || content.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Content is required'
                });
            }

            // Check if admission info already exists
            const existingInfo = await admissionInfoCollection.findOne({});

            if (existingInfo) {
                // Update existing admission info
                const result = await admissionInfoCollection.updateOne(
                    { _id: existingInfo._id },
                    { 
                        $set: { 
                            content: content.trim(),
                            updatedAt: new Date()
                        } 
                    }
                );

                if (result.modifiedCount > 0) {
                    const updatedInfo = await admissionInfoCollection.findOne({ _id: existingInfo._id });
                    res.json({
                        success: true,
                        message: 'Admission information updated successfully',
                        data: updatedInfo
                    });
                } else {
                    res.status(400).json({
                        success: false,
                        message: 'Failed to update admission information'
                    });
                }
            } else {
                // Create new admission info
                const newAdmissionInfo = {
                    content: content.trim(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                const result = await admissionInfoCollection.insertOne(newAdmissionInfo);

                if (result.insertedId) {
                    const createdInfo = await admissionInfoCollection.findOne({ _id: result.insertedId });
                    res.status(201).json({
                        success: true,
                        message: 'Admission information created successfully',
                        data: createdInfo
                    });
                } else {
                    res.status(400).json({
                        success: false,
                        message: 'Failed to create admission information'
                    });
                }
            }
        } catch (error) {
            console.error('Error saving admission info:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to save admission information'
            });
        }
    });

    // DELETE admission info
    router.delete('/', async (req, res) => {
        try {
            const result = await admissionInfoCollection.deleteOne({});

            if (result.deletedCount > 0) {
                res.json({
                    success: true,
                    message: 'Admission information deleted successfully'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'No admission information found to delete'
                });
            }
        } catch (error) {
            console.error('Error deleting admission info:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete admission information'
            });
        }
    });

    return router;
};