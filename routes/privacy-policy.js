const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (privacyPolicyCollection) => {

    // GET privacy policy (only one record should exist)
    router.get('/', async (req, res) => {
        try {
            const privacyPolicy = await privacyPolicyCollection.findOne({});
            
            res.json({
                success: true,
                data: privacyPolicy,
                exists: !!privacyPolicy
            });
        } catch (error) {
            console.error('Error fetching privacy policy:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch privacy policy'
            });
        }
    });

    // CREATE privacy policy
    router.post('/', async (req, res) => {
        try {
            const { 
                content
            } = req.body;

            // Validation
            if (!content || !content.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Privacy policy content is required'
                });
            }

            // Check if privacy policy already exists
            const existingPolicy = await privacyPolicyCollection.findOne({});
            if (existingPolicy) {
                return res.status(400).json({
                    success: false,
                    message: 'Privacy policy already exists. Use update instead.'
                });
            }

            const newPrivacyPolicy = {
                content: content,
                version: '1.0',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await privacyPolicyCollection.insertOne(newPrivacyPolicy);

            if (result.insertedId) {
                const createdPolicy = await privacyPolicyCollection.findOne({ _id: result.insertedId });
                res.status(201).json({
                    success: true,
                    message: 'Privacy policy created successfully',
                    data: createdPolicy
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to create privacy policy'
                });
            }
        } catch (error) {
            console.error('Error creating privacy policy:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create privacy policy'
            });
        }
    });

    // UPDATE privacy policy
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { 
                content
            } = req.body;

            // Validation
            if (!content || !content.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Privacy policy content is required'
                });
            }

            // Get current policy to maintain version history if needed
            const currentPolicy = await privacyPolicyCollection.findOne({ _id: new ObjectId(id) });
            if (!currentPolicy) {
                return res.status(404).json({
                    success: false,
                    message: 'Privacy policy not found'
                });
            }

            // Calculate new version (increment minor version)
            const versionParts = currentPolicy.version.split('.');
            const newVersion = `${versionParts[0]}.${parseInt(versionParts[1]) + 1}`;

            const updateData = {
                content: content,
                version: newVersion,
                updatedAt: new Date()
            };

            const result = await privacyPolicyCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.modifiedCount > 0) {
                const updatedPolicy = await privacyPolicyCollection.findOne({ _id: new ObjectId(id) });
                res.json({
                    success: true,
                    message: 'Privacy policy updated successfully',
                    data: updatedPolicy
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Privacy policy not found or no changes made'
                });
            }
        } catch (error) {
            console.error('Error updating privacy policy:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update privacy policy'
            });
        }
    });

    // DELETE privacy policy
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            const result = await privacyPolicyCollection.deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount > 0) {
                res.json({
                    success: true,
                    message: 'Privacy policy deleted successfully'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Privacy policy not found'
                });
            }
        } catch (error) {
            console.error('Error deleting privacy policy:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete privacy policy'
            });
        }
    });

    // TOGGLE privacy policy status
    router.patch('/:id/toggle', async (req, res) => {
        try {
            const privacyPolicy = await privacyPolicyCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!privacyPolicy) {
                return res.status(404).json({
                    success: false,
                    message: 'Privacy policy not found'
                });
            }

            const result = await privacyPolicyCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { 
                    $set: { 
                        isActive: !privacyPolicy.isActive,
                        updatedAt: new Date()
                    } 
                }
            );

            res.json({
                success: true,
                message: `Privacy policy ${!privacyPolicy.isActive ? 'activated' : 'deactivated'} successfully`,
                data: {
                    isActive: !privacyPolicy.isActive
                }
            });
        } catch (error) {
            console.error('Error toggling privacy policy status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to toggle privacy policy status'
            });
        }
    });

    // GET privacy policy version history (if you want to implement versioning)
    router.get('/:id/versions', async (req, res) => {
        try {
            // This would require a separate collection for version history
            // For now, we'll just return the current policy
            const privacyPolicy = await privacyPolicyCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!privacyPolicy) {
                return res.status(404).json({
                    success: false,
                    message: 'Privacy policy not found'
                });
            }

            res.json({
                success: true,
                data: [privacyPolicy], // Return as array for future version history
                message: 'Version history endpoint - implement version collection for full history'
            });
        } catch (error) {
            console.error('Error fetching version history:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch version history'
            });
        }
    });

    return router;
};