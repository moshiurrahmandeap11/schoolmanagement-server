const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

module.exports = (galleryCollection) => {
    
    // ==================== VIDEO ROUTES ====================
    
    // GET all videos
    router.get('/videos', async (req, res) => {
        try {
            const videos = await galleryCollection
                .find({ type: 'video' })
                .sort({ createdAt: -1 })
                .toArray();
            
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

    // CREATE new video
    router.post('/videos', async (req, res) => {
        try {
            const { caption, youtubeUrl, videoId } = req.body;

            // Validation
            if (!caption || !youtubeUrl || !videoId) {
                return res.status(400).json({
                    success: false,
                    message: 'সব ফিল্ড পূরণ করুন'
                });
            }

            const newVideo = {
                type: 'video',
                caption,
                youtubeUrl,
                videoId,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await galleryCollection.insertOne(newVideo);
            
            res.status(201).json({
                success: true,
                message: 'ভিডিও সফলভাবে যুক্ত হয়েছে',
                data: {
                    _id: result.insertedId,
                    ...newVideo
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ভিডিও যুক্ত করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // DELETE video
    router.delete('/videos/:id', async (req, res) => {
        try {
            const video = await galleryCollection.findOne({ 
                _id: new ObjectId(req.params.id),
                type: 'video'
            });

            if (!video) {
                return res.status(404).json({
                    success: false,
                    message: 'ভিডিও পাওয়া যায়নি'
                });
            }

            await galleryCollection.deleteOne({ 
                _id: new ObjectId(req.params.id) 
            });

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

    // TOGGLE video status
    router.patch('/videos/:id/toggle', async (req, res) => {
        try {
            const video = await galleryCollection.findOne({ 
                _id: new ObjectId(req.params.id),
                type: 'video'
            });

            if (!video) {
                return res.status(404).json({
                    success: false,
                    message: 'ভিডিও পাওয়া যায়নি'
                });
            }

            await galleryCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { 
                    $set: { 
                        isActive: !video.isActive,
                        updatedAt: new Date()
                    } 
                }
            );

            res.json({
                success: true,
                message: `ভিডিও ${!video.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে`,
                data: {
                    isActive: !video.isActive
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ভিডিও স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ==================== PHOTO ROUTES ====================
    
    // GET all photos
    router.get('/photos', async (req, res) => {
        try {
            const photos = await galleryCollection
                .find({ type: 'photo' })
                .sort({ createdAt: -1 })
                .toArray();
            
            res.json({
                success: true,
                data: photos
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ফটো লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // CREATE new photos (multiple upload)
    router.post('/photos', upload.array('photos', 10), async (req, res) => {
        try {
            const { caption } = req.body;

            // Validation
            if (!caption) {
                return res.status(400).json({
                    success: false,
                    message: 'ক্যাপশন আবশ্যক'
                });
            }

            if (!req.files || req.files.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'ইমেজ ফাইল আবশ্যক'
                });
            }

            // Create photo documents for each uploaded file
            const photoDocuments = req.files.map(file => ({
                type: 'photo',
                caption,
                image: `/uploads/${file.filename}`,
                imageOriginalName: file.originalname,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            }));

            const result = await galleryCollection.insertMany(photoDocuments);
            
            res.status(201).json({
                success: true,
                message: `${photoDocuments.length}টি ফটো সফলভাবে যুক্ত হয়েছে`,
                data: photoDocuments
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ফটো যুক্ত করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // DELETE photo
    router.delete('/photos/:id', async (req, res) => {
        try {
            const photo = await galleryCollection.findOne({ 
                _id: new ObjectId(req.params.id),
                type: 'photo'
            });

            if (!photo) {
                return res.status(404).json({
                    success: false,
                    message: 'ফটো পাওয়া যায়নি'
                });
            }

            // Delete image file
            if (photo.image && photo.image.startsWith('/uploads/')) {
                const filename = photo.image.replace('/uploads/', '');
                const imagePath = path.join(__dirname, '..', 'uploads', filename);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }

            await galleryCollection.deleteOne({ 
                _id: new ObjectId(req.params.id) 
            });

            res.json({
                success: true,
                message: 'ফটো সফলভাবে ডিলিট হয়েছে'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ফটো ডিলিট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // TOGGLE photo status
    router.patch('/photos/:id/toggle', async (req, res) => {
        try {
            const photo = await galleryCollection.findOne({ 
                _id: new ObjectId(req.params.id),
                type: 'photo'
            });

            if (!photo) {
                return res.status(404).json({
                    success: false,
                    message: 'ফটো পাওয়া যায়নি'
                });
            }

            await galleryCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { 
                    $set: { 
                        isActive: !photo.isActive,
                        updatedAt: new Date()
                    } 
                }
            );

            res.json({
                success: true,
                message: `ফটো ${!photo.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে`,
                data: {
                    isActive: !photo.isActive
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ফটো স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    return router;
};