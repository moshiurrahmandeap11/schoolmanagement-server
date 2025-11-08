const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (socialLinksCollection) => {

    // GET all social links
    router.get('/', async (req, res) => {
        try {
            const socialLinks = await socialLinksCollection.find({}).sort({ platform: 1 }).toArray();
            res.json({
                success: true,
                data: socialLinks,
                count: socialLinks.length
            });
        } catch (error) {
            console.error('Error fetching social links:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch social links'
            });
        }
    });

    // GET single social link by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const socialLink = await socialLinksCollection.findOne({ _id: new ObjectId(id) });

            if (!socialLink) {
                return res.status(404).json({
                    success: false,
                    message: 'Social link not found'
                });
            }

            res.json({
                success: true,
                data: socialLink
            });
        } catch (error) {
            console.error('Error fetching social link:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch social link'
            });
        }
    });

    // CREATE new social link
    router.post('/', async (req, res) => {
        try {
            const { 
                platform,
                url
            } = req.body;

            // Validation
            if (!platform || !url) {
                return res.status(400).json({
                    success: false,
                    message: 'Platform and URL are required fields'
                });
            }

            // URL validation
            try {
                new URL(url);
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Please enter a valid URL'
                });
            }

            // Platform validation
            const validPlatforms = ['facebook', 'youtube', 'twitter', 'linkedin', 'instagram'];
            if (!validPlatforms.includes(platform)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid platform selected'
                });
            }

            // Platform-specific URL validation
            const urlLower = url.toLowerCase();
            let isValidPlatformUrl = false;

            switch (platform) {
                case 'facebook':
                    isValidPlatformUrl = urlLower.includes('facebook.com');
                    break;
                case 'youtube':
                    isValidPlatformUrl = urlLower.includes('youtube.com');
                    break;
                case 'twitter':
                    isValidPlatformUrl = urlLower.includes('twitter.com') || urlLower.includes('x.com');
                    break;
                case 'linkedin':
                    isValidPlatformUrl = urlLower.includes('linkedin.com');
                    break;
                case 'instagram':
                    isValidPlatformUrl = urlLower.includes('instagram.com');
                    break;
            }

            if (!isValidPlatformUrl) {
                return res.status(400).json({
                    success: false,
                    message: `URL does not match the selected platform (${platform})`
                });
            }

            // Check if platform already exists
            const existingLink = await socialLinksCollection.findOne({ platform });
            if (existingLink) {
                return res.status(400).json({
                    success: false,
                    message: `A social link for ${platform} already exists`
                });
            }

            const newSocialLink = {
                platform: platform,
                url: url.trim(),
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await socialLinksCollection.insertOne(newSocialLink);

            if (result.insertedId) {
                const createdLink = await socialLinksCollection.findOne({ _id: result.insertedId });
                res.status(201).json({
                    success: true,
                    message: 'Social link created successfully',
                    data: createdLink
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to create social link'
                });
            }
        } catch (error) {
            console.error('Error creating social link:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create social link'
            });
        }
    });

    // UPDATE social link
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { 
                platform,
                url
            } = req.body;

            // Validation
            if (!platform || !url) {
                return res.status(400).json({
                    success: false,
                    message: 'Platform and URL are required fields'
                });
            }

            // URL validation
            try {
                new URL(url);
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Please enter a valid URL'
                });
            }

            // Platform validation
            const validPlatforms = ['facebook', 'youtube', 'twitter', 'linkedin', 'instagram'];
            if (!validPlatforms.includes(platform)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid platform selected'
                });
            }

            // Platform-specific URL validation
            const urlLower = url.toLowerCase();
            let isValidPlatformUrl = false;

            switch (platform) {
                case 'facebook':
                    isValidPlatformUrl = urlLower.includes('facebook.com');
                    break;
                case 'youtube':
                    isValidPlatformUrl = urlLower.includes('youtube.com');
                    break;
                case 'twitter':
                    isValidPlatformUrl = urlLower.includes('twitter.com') || urlLower.includes('x.com');
                    break;
                case 'linkedin':
                    isValidPlatformUrl = urlLower.includes('linkedin.com');
                    break;
                case 'instagram':
                    isValidPlatformUrl = urlLower.includes('instagram.com');
                    break;
            }

            if (!isValidPlatformUrl) {
                return res.status(400).json({
                    success: false,
                    message: `URL does not match the selected platform (${platform})`
                });
            }

            // Check if platform already exists for other links
            const existingLink = await socialLinksCollection.findOne({ 
                platform, 
                _id: { $ne: new ObjectId(id) } 
            });
            
            if (existingLink) {
                return res.status(400).json({
                    success: false,
                    message: `A social link for ${platform} already exists`
                });
            }

            const updateData = {
                platform: platform,
                url: url.trim(),
                updatedAt: new Date()
            };

            const result = await socialLinksCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.modifiedCount > 0) {
                const updatedLink = await socialLinksCollection.findOne({ _id: new ObjectId(id) });
                res.json({
                    success: true,
                    message: 'Social link updated successfully',
                    data: updatedLink
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Social link not found or no changes made'
                });
            }
        } catch (error) {
            console.error('Error updating social link:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update social link'
            });
        }
    });

    // DELETE social link
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            const result = await socialLinksCollection.deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount > 0) {
                res.json({
                    success: true,
                    message: 'Social link deleted successfully'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Social link not found'
                });
            }
        } catch (error) {
            console.error('Error deleting social link:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete social link'
            });
        }
    });

    // TOGGLE social link status
    router.patch('/:id/toggle', async (req, res) => {
        try {
            const socialLink = await socialLinksCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!socialLink) {
                return res.status(404).json({
                    success: false,
                    message: 'Social link not found'
                });
            }

            const result = await socialLinksCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { 
                    $set: { 
                        isActive: !socialLink.isActive,
                        updatedAt: new Date()
                    } 
                }
            );

            res.json({
                success: true,
                message: `Social link ${!socialLink.isActive ? 'activated' : 'deactivated'} successfully`,
                data: {
                    isActive: !socialLink.isActive
                }
            });
        } catch (error) {
            console.error('Error toggling social link status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to toggle social link status'
            });
        }
    });

    return router;
};