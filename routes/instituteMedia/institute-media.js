const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (instituteMediaCollection) => {
    
    // GET all institute media
    router.get('/', async (req, res) => {
        try {
            const media = await instituteMediaCollection.find({})
                .sort({ createdAt: -1 })
                .toArray();
                
            res.status(200).json({
                success: true,
                data: media
            });
        } catch (error) {
            console.error('Error fetching institute media:', error);
            res.status(500).json({
                success: false,
                message: 'মিডিয়া লোড করতে সমস্যা হয়েছে'
            });
        }
    });

    // GET single media by ID
    router.get('/:id', async (req, res) => {
        try {
            const media = await instituteMediaCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });
            
            if (!media) {
                return res.status(404).json({
                    success: false,
                    message: 'মিডিয়া পাওয়া যায়নি'
                });
            }
            
            res.status(200).json({
                success: true,
                data: media
            });
        } catch (error) {
            console.error('Error fetching media:', error);
            res.status(500).json({
                success: false,
                message: 'মিডিয়া লোড করতে সমস্যা হয়েছে'
            });
        }
    });

    // POST create new media
    router.post('/', async (req, res) => {
        try {
            const { name, youtubeChannelLink, featuredVideoLink } = req.body;

            // Validation
            if (!name || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'মিডিয়ার নাম প্রয়োজন'
                });
            }

            if (!youtubeChannelLink || !youtubeChannelLink.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'ইউটিউব চ্যানেল লিংক প্রয়োজন'
                });
            }

            // YouTube channel link validation
            const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
            if (!youtubeRegex.test(youtubeChannelLink)) {
                return res.status(400).json({
                    success: false,
                    message: 'সঠিক ইউটিউব চ্যানেল লিংক দিন'
                });
            }

            // Featured video link validation (if provided)
            if (featuredVideoLink && featuredVideoLink.trim()) {
                if (!youtubeRegex.test(featuredVideoLink)) {
                    return res.status(400).json({
                        success: false,
                        message: 'সঠিক ইউটিউব ভিডিও লিংক দিন'
                    });
                }
            }

            // Check if media already exists
            const existingMedia = await instituteMediaCollection.findOne({ 
                name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } 
            });

            if (existingMedia) {
                return res.status(400).json({
                    success: false,
                    message: 'এই নামের মিডিয়া ইতিমধ্যে存在'
                });
            }

            const mediaData = {
                name: name.trim(),
                youtubeChannelLink: youtubeChannelLink.trim(),
                featuredVideoLink: featuredVideoLink?.trim() || '',
                slug: name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, ''),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await instituteMediaCollection.insertOne(mediaData);

            res.status(201).json({
                success: true,
                message: 'মিডিয়া সফলভাবে তৈরি হয়েছে',
                data: {
                    _id: result.insertedId,
                    ...mediaData
                }
            });
        } catch (error) {
            console.error('Error creating media:', error);
            res.status(500).json({
                success: false,
                message: 'মিডিয়া তৈরি করতে সমস্যা হয়েছে'
            });
        }
    });

    // PUT update media
    router.put('/:id', async (req, res) => {
        try {
            const { name, youtubeChannelLink, featuredVideoLink } = req.body;

            // Validation
            if (!name || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'মিডিয়ার নাম প্রয়োজন'
                });
            }

            if (!youtubeChannelLink || !youtubeChannelLink.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'ইউটিউব চ্যানেল লিংক প্রয়োজন'
                });
            }

            // YouTube channel link validation
            const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
            if (!youtubeRegex.test(youtubeChannelLink)) {
                return res.status(400).json({
                    success: false,
                    message: 'সঠিক ইউটিউব চ্যানেল লিংক দিন'
                });
            }

            // Featured video link validation (if provided)
            if (featuredVideoLink && featuredVideoLink.trim()) {
                if (!youtubeRegex.test(featuredVideoLink)) {
                    return res.status(400).json({
                        success: false,
                        message: 'সঠিক ইউটিউব ভিডিও লিংক দিন'
                    });
                }
            }

            // Check if media already exists (excluding current media)
            const existingMedia = await instituteMediaCollection.findOne({ 
                name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
                _id: { $ne: new ObjectId(req.params.id) }
            });

            if (existingMedia) {
                return res.status(400).json({
                    success: false,
                    message: 'এই নামের মিডিয়া ইতিমধ্যে存在'
                });
            }

            const updateData = {
                name: name.trim(),
                youtubeChannelLink: youtubeChannelLink.trim(),
                featuredVideoLink: featuredVideoLink?.trim() || '',
                slug: name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, ''),
                updatedAt: new Date()
            };

            const result = await instituteMediaCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: updateData }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'মিডিয়া পাওয়া যায়নি'
                });
            }

            res.status(200).json({
                success: true,
                message: 'মিডিয়া সফলভাবে আপডেট হয়েছে'
            });
        } catch (error) {
            console.error('Error updating media:', error);
            res.status(500).json({
                success: false,
                message: 'মিডিয়া আপডেট করতে সমস্যা হয়েছে'
            });
        }
    });

    // DELETE media
    router.delete('/:id', async (req, res) => {
        try {
            const result = await instituteMediaCollection.deleteOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'মিডিয়া পাওয়া যায়নি'
                });
            }

            res.status(200).json({
                success: true,
                message: 'মিডিয়া সফলভাবে ডিলিট হয়েছে'
            });
        } catch (error) {
            console.error('Error deleting media:', error);
            res.status(500).json({
                success: false,
                message: 'মিডিয়া ডিলিট করতে সমস্যা হয়েছে'
            });
        }
    });

    // GET media count
    router.get('/count/total', async (req, res) => {
        try {
            const totalCount = await instituteMediaCollection.countDocuments();
            res.status(200).json({
                success: true,
                data: { total: totalCount }
            });
        } catch (error) {
            console.error('Error counting media:', error);
            res.status(500).json({
                success: false,
                message: 'মিডিয়া কাউন্ট করতে সমস্যা হয়েছে'
            });
        }
    });

    return router;
};