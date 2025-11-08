const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (videosCollection) => {
    
    // ✅ GET all videos
    router.get('/', async (req, res) => {
        try {
            const videos = await videosCollection.find().sort({ createdAt: -1 }).toArray();
            res.json({
                success: true,
                data: videos
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ভিডিও লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ✅ GET single video by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ ভিডিও আইডি'
                });
            }

            const video = await videosCollection.findOne({ _id: new ObjectId(id) });

            if (!video) {
                return res.status(404).json({
                    success: false,
                    message: 'ভিডিও পাওয়া যায়নি'
                });
            }

            res.json({
                success: true,
                data: video
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ভিডিও ডেটা আনতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ✅ CREATE new video
    router.post('/', async (req, res) => {
        try {
            const { title, videoLink, videoId, isPremium, playlist, teacher, tags } = req.body;

            if (!title || !videoLink || !videoId) {
                return res.status(400).json({
                    success: false,
                    message: 'ভিডিও শিরোনাম, লিংক এবং আইডি আবশ্যক'
                });
            }

            // Check if video title already exists
            const existingVideo = await videosCollection.findOne({ 
                title: { $regex: new RegExp(`^${title}$`, 'i') } 
            });

            if (existingVideo) {
                return res.status(400).json({
                    success: false,
                    message: 'এই শিরোনামের ভিডিও ইতিমধ্যে存在'
                });
            }

            // Check if video ID already exists
            const existingVideoId = await videosCollection.findOne({ 
                videoId: { $regex: new RegExp(`^${videoId}$`, 'i') } 
            });

            if (existingVideoId) {
                return res.status(400).json({
                    success: false,
                    message: 'এই ভিডিও আইডি ইতিমধ্যে存在'
                });
            }

            const newVideo = {
                title: title.trim(),
                videoLink: videoLink.trim(),
                videoId: videoId.trim(),
                isPremium: isPremium ? JSON.parse(isPremium) : false,
                playlist: playlist || '',
                teacher: teacher || '',
                tags: tags || '',
                isActive: true,
                views: 0,
                duration: '0:00',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await videosCollection.insertOne(newVideo);

            res.status(201).json({
                success: true,
                message: 'ভিডিও সফলভাবে তৈরি হয়েছে',
                data: {
                    _id: result.insertedId,
                    ...newVideo
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ভিডিও তৈরি করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ✅ UPDATE video
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { title, videoLink, videoId, isPremium, playlist, teacher, tags } = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ ভিডিও আইডি'
                });
            }

            const existingVideo = await videosCollection.findOne({ _id: new ObjectId(id) });
            if (!existingVideo) {
                return res.status(404).json({
                    success: false,
                    message: 'ভিডিও পাওয়া যায়নি'
                });
            }

            // Check if video title already exists (excluding current video)
            if (title && title !== existingVideo.title) {
                const duplicateVideo = await videosCollection.findOne({ 
                    title: { $regex: new RegExp(`^${title}$`, 'i') },
                    _id: { $ne: new ObjectId(id) }
                });

                if (duplicateVideo) {
                    return res.status(400).json({
                        success: false,
                        message: 'এই শিরোনামের ভিডিও ইতিমধ্যে存在'
                    });
                }
            }

            // Check if video ID already exists (excluding current video)
            if (videoId && videoId !== existingVideo.videoId) {
                const duplicateVideoId = await videosCollection.findOne({ 
                    videoId: { $regex: new RegExp(`^${videoId}$`, 'i') },
                    _id: { $ne: new ObjectId(id) }
                });

                if (duplicateVideoId) {
                    return res.status(400).json({
                        success: false,
                        message: 'এই ভিডিও আইডি ইতিমধ্যে存在'
                    });
                }
            }

            const updatedData = {
                title: title || existingVideo.title,
                videoLink: videoLink || existingVideo.videoLink,
                videoId: videoId || existingVideo.videoId,
                isPremium: isPremium !== undefined ? JSON.parse(isPremium) : existingVideo.isPremium,
                playlist: playlist || existingVideo.playlist,
                teacher: teacher || existingVideo.teacher,
                tags: tags || existingVideo.tags,
                updatedAt: new Date()
            };

            await videosCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedData }
            );

            res.json({
                success: true,
                message: 'ভিডিও সফলভাবে আপডেট হয়েছে',
                data: updatedData
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ভিডিও আপডেট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ✅ DELETE video
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ ভিডিও আইডি'
                });
            }

            const video = await videosCollection.findOne({ _id: new ObjectId(id) });

            if (!video) {
                return res.status(404).json({
                    success: false,
                    message: 'ভিডিও পাওয়া যায়নি'
                });
            }

            await videosCollection.deleteOne({ _id: new ObjectId(id) });

            res.json({
                success: true,
                message: 'ভিডিও সফলভাবে ডিলিট হয়েছে'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ভিডিও ডিলিট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    return router;
};