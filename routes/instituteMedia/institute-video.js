const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (instituteVideoCollection) => {
    
    // GET all institute videos
    router.get('/', async (req, res) => {
        try {
            const videos = await instituteVideoCollection.aggregate([
                {
                    $lookup: {
                        from: 'playlists',
                        localField: 'playlistId',
                        foreignField: '_id',
                        as: 'playlist'
                    }
                },
                {
                    $lookup: {
                        from: 'teachers',
                        localField: 'teacherId',
                        foreignField: '_id',
                        as: 'teacher'
                    }
                },
                {
                    $unwind: {
                        path: '$playlist',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $unwind: {
                        path: '$teacher',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $sort: { createdAt: -1 }
                },
                {
                    $project: {
                        videoTitle: 1,
                        videoLink: 1,
                        videoId: 1,
                        isPremium: 1,
                        playlistId: 1,
                        playlistName: '$playlist.name',
                        teacherId: 1,
                        teacherName: '$teacher.name',
                        tags: 1,
                        createdAt: 1,
                        updatedAt: 1
                    }
                }
            ]).toArray();
                
            res.status(200).json({
                success: true,
                data: videos
            });
        } catch (error) {
            console.error('Error fetching institute videos:', error);
            res.status(500).json({
                success: false,
                message: 'ভিডিও লোড করতে সমস্যা হয়েছে'
            });
        }
    });

    // GET single video by ID
    router.get('/:id', async (req, res) => {
        try {
            const video = await instituteVideoCollection.aggregate([
                {
                    $match: { _id: new ObjectId(req.params.id) }
                },
                {
                    $lookup: {
                        from: 'playlists',
                        localField: 'playlistId',
                        foreignField: '_id',
                        as: 'playlist'
                    }
                },
                {
                    $lookup: {
                        from: 'teachers',
                        localField: 'teacherId',
                        foreignField: '_id',
                        as: 'teacher'
                    }
                },
                {
                    $unwind: {
                        path: '$playlist',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $unwind: {
                        path: '$teacher',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        videoTitle: 1,
                        videoLink: 1,
                        videoId: 1,
                        isPremium: 1,
                        playlistId: 1,
                        playlistName: '$playlist.name',
                        teacherId: 1,
                        teacherName: '$teacher.name',
                        tags: 1,
                        createdAt: 1,
                        updatedAt: 1
                    }
                }
            ]).next();

            if (!video) {
                return res.status(404).json({
                    success: false,
                    message: 'ভিডিও পাওয়া যায়নি'
                });
            }
            
            res.status(200).json({
                success: true,
                data: video
            });
        } catch (error) {
            console.error('Error fetching video:', error);
            res.status(500).json({
                success: false,
                message: 'ভিডিও লোড করতে সমস্যা হয়েছে'
            });
        }
    });

    // POST create new video
    router.post('/', async (req, res) => {
        try {
            const { 
                videoTitle, 
                videoLink, 
                videoId, 
                isPremium, 
                playlistId, 
                playlistName, 
                teacherId, 
                teacherName, 
                tags 
            } = req.body;

            // Validation
            if (!videoTitle || !videoTitle.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'ভিডিও শিরোনাম প্রয়োজন'
                });
            }

            if (!videoLink || !videoLink.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'ভিডিও লিংক প্রয়োজন'
                });
            }

            if (!videoId || !videoId.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'ভিডিও আইডি প্রয়োজন'
                });
            }

            // YouTube link validation
            const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
            if (!youtubeRegex.test(videoLink)) {
                return res.status(400).json({
                    success: false,
                    message: 'সঠিক ইউটিউব ভিডিও লিংক দিন'
                });
            }

            // Check if video already exists
            const existingVideo = await instituteVideoCollection.findOne({ 
                videoId: videoId.trim()
            });

            if (existingVideo) {
                return res.status(400).json({
                    success: false,
                    message: 'এই ভিডিও আইডি দিয়ে ইতিমধ্যে ভিডিও存在'
                });
            }

            const videoData = {
                videoTitle: videoTitle.trim(),
                videoLink: videoLink.trim(),
                videoId: videoId.trim(),
                isPremium: isPremium === 'true' || isPremium === true,
                playlistId: playlistId?.trim() || null,
                playlistName: playlistName?.trim() || null,
                teacherId: teacherId?.trim() || null,
                teacherName: teacherName?.trim() || null,
                tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
                slug: videoTitle.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, ''),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await instituteVideoCollection.insertOne(videoData);

            res.status(201).json({
                success: true,
                message: 'ভিডিও সফলভাবে তৈরি হয়েছে',
                data: {
                    _id: result.insertedId,
                    ...videoData
                }
            });
        } catch (error) {
            console.error('Error creating video:', error);
            res.status(500).json({
                success: false,
                message: 'ভিডিও তৈরি করতে সমস্যা হয়েছে'
            });
        }
    });

    // PUT update video
    router.put('/:id', async (req, res) => {
        try {
            const { 
                videoTitle, 
                videoLink, 
                videoId, 
                isPremium, 
                playlistId, 
                playlistName, 
                teacherId, 
                teacherName, 
                tags 
            } = req.body;

            // Validation
            if (!videoTitle || !videoTitle.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'ভিডিও শিরোনাম প্রয়োজন'
                });
            }

            if (!videoLink || !videoLink.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'ভিডিও লিংক প্রয়োজন'
                });
            }

            if (!videoId || !videoId.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'ভিডিও আইডি প্রয়োজন'
                });
            }

            // YouTube link validation
            const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
            if (!youtubeRegex.test(videoLink)) {
                return res.status(400).json({
                    success: false,
                    message: 'সঠিক ইউটিউব ভিডিও লিংক দিন'
                });
            }

            // Check if video already exists (excluding current video)
            const existingVideo = await instituteVideoCollection.findOne({ 
                videoId: videoId.trim(),
                _id: { $ne: new ObjectId(req.params.id) }
            });

            if (existingVideo) {
                return res.status(400).json({
                    success: false,
                    message: 'এই ভিডিও আইডি দিয়ে ইতিমধ্যে ভিডিও存在'
                });
            }

            const updateData = {
                videoTitle: videoTitle.trim(),
                videoLink: videoLink.trim(),
                videoId: videoId.trim(),
                isPremium: isPremium === 'true' || isPremium === true,
                playlistId: playlistId?.trim() || null,
                playlistName: playlistName?.trim() || null,
                teacherId: teacherId?.trim() || null,
                teacherName: teacherName?.trim() || null,
                tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
                slug: videoTitle.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, ''),
                updatedAt: new Date()
            };

            const result = await instituteVideoCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: updateData }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'ভিডিও পাওয়া যায়নি'
                });
            }

            res.status(200).json({
                success: true,
                message: 'ভিডিও সফলভাবে আপডেট হয়েছে'
            });
        } catch (error) {
            console.error('Error updating video:', error);
            res.status(500).json({
                success: false,
                message: 'ভিডিও আপডেট করতে সমস্যা হয়েছে'
            });
        }
    });

    // DELETE video
    router.delete('/:id', async (req, res) => {
        try {
            const result = await instituteVideoCollection.deleteOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'ভিডিও পাওয়া যায়নি'
                });
            }

            res.status(200).json({
                success: true,
                message: 'ভিডিও সফলভাবে ডিলিট হয়েছে'
            });
        } catch (error) {
            console.error('Error deleting video:', error);
            res.status(500).json({
                success: false,
                message: 'ভিডিও ডিলিট করতে সমস্যা হয়েছে'
            });
        }
    });

    // GET videos by playlist
    router.get('/playlist/:playlistId', async (req, res) => {
        try {
            const videos = await instituteVideoCollection.find({ 
                playlistId: req.params.playlistId 
            }).sort({ createdAt: -1 }).toArray();

            res.status(200).json({
                success: true,
                data: videos
            });
        } catch (error) {
            console.error('Error fetching videos by playlist:', error);
            res.status(500).json({
                success: false,
                message: 'ভিডিও লোড করতে সমস্যা হয়েছে'
            });
        }
    });

    // GET videos by teacher
    router.get('/teacher/:teacherId', async (req, res) => {
        try {
            const videos = await instituteVideoCollection.find({ 
                teacherId: req.params.teacherId 
            }).sort({ createdAt: -1 }).toArray();

            res.status(200).json({
                success: true,
                data: videos
            });
        } catch (error) {
            console.error('Error fetching videos by teacher:', error);
            res.status(500).json({
                success: false,
                message: 'ভিডিও লোড করতে সমস্যা হয়েছে'
            });
        }
    });

    return router;
};