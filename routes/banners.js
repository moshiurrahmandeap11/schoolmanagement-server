const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

module.exports = (bannersCollection) => {
    
    // GET all banners
    router.get('/', async (req, res) => {
        try {
            const banners = await bannersCollection.find().toArray();
            res.json({
                success: true,
                data: banners
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ব্যানার লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

// CREATE new banner with file upload
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { title, link, isActive } = req.body;

        if (!title) {
            return res.status(400).json({
                success: false,
                message: 'টাইটেল আবশ্যক'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'ইমেজ ফাইল আবশ্যক'
            });
        }

        const newBanner = {
            title,
            image: `/api/uploads/${req.file.filename}`, // ✅ এটা ঠিক আছে
            imageOriginalName: req.file.originalname,
            imageSize: req.file.size, // ফাইল সাইজ যোগ করলাম
            imageMimeType: req.file.mimetype, // MIME type যোগ করলাম
            link: link || '',
            isActive: isActive !== undefined ? JSON.parse(isActive) : true,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await bannersCollection.insertOne(newBanner);
        
        res.status(201).json({
            success: true,
            message: 'ব্যানার সফলভাবে তৈরি হয়েছে',
            data: {
                _id: result.insertedId,
                ...newBanner
            }
        });
    } catch (error) {
        // যদি error হয় তাহলে uploaded file delete করো
        if (req.file) {
            const filePath = path.join(__dirname, '..', 'uploads', req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        
        res.status(500).json({
            success: false,
            message: 'ব্যানার তৈরি করতে সমস্যা হয়েছে',
            error: error.message
        });
    }
});

    // DELETE banner
    router.delete('/:id', async (req, res) => {
        try {
            const banner = await bannersCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!banner) {
                return res.status(404).json({
                    success: false,
                    message: 'ব্যানার পাওয়া যায়নি'
                });
            }

            // Delete image file
            if (banner.image && banner.image.startsWith('/api/uploads/')) {
                const filename = banner.image.replace('/api/uploads/', '');
                const imagePath = path.join(__dirname, '..', 'uploads', filename);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }

            const result = await bannersCollection.deleteOne({ 
                _id: new ObjectId(req.params.id) 
            });

            res.json({
                success: true,
                message: 'ব্যানার সফলভাবে ডিলিট হয়েছে'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ব্যানার ডিলিট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // TOGGLE banner status
    router.patch('/:id/toggle', async (req, res) => {
        try {
            const banner = await bannersCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!banner) {
                return res.status(404).json({
                    success: false,
                    message: 'ব্যানার পাওয়া যায়নি'
                });
            }

            const result = await bannersCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { 
                    $set: { 
                        isActive: !banner.isActive,
                        updatedAt: new Date()
                    } 
                }
            );

            res.json({
                success: true,
                message: `ব্যানার ${!banner.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে`,
                data: {
                    isActive: !banner.isActive
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ব্যানার স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    return router;
};