const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const upload = require('../middleware/upload');
const fs = require('fs');
const path = require('path');

module.exports = (recentlyCollection) => {

    // GET all recent items
    router.get('/', async (req, res) => {
        try {
            const recentItems = await recentlyCollection.find().sort({ createdAt: -1 }).toArray();
            res.json({
                success: true,
                data: recentItems
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'রিসেন্ট আইটেম লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // GET single recent item by ID
    router.get('/:id', async (req, res) => {
        try {
            const item = await recentlyCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });
            
            if (!item) {
                return res.status(404).json({
                    success: false,
                    message: 'রিসেন্ট আইটেম পাওয়া যায়নি'
                });
            }

            res.json({
                success: true,
                data: item
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'রিসেন্ট আইটেম লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // UPLOAD editor image separately (for body content images)
    router.post('/upload-editor-image', upload.single('image'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'ইমেজ ফাইল আবশ্যক'
                });
            }

            const imageUrl = `/uploads/${req.file.filename}`;
            
            res.status(200).json({
                success: true,
                message: 'ইমেজ সফলভাবে আপলোড হয়েছে',
                data: {
                    imageUrl: imageUrl
                }
            });
        } catch (error) {
            // Delete uploaded file if error occurs
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            res.status(500).json({
                success: false,
                message: 'ইমেজ আপলোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // CREATE new recent item with image upload
    router.post('/', upload.single('image'), async (req, res) => {
        try {
            const { title, body } = req.body;

            // Validation
            if (!title || !body) {
                // Delete uploaded file if validation fails
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(400).json({
                    success: false,
                    message: 'টাইটেল এবং বডি আবশ্যক'
                });
            }

            const newItem = {
                title,
                image: req.file ? `/uploads/${req.file.filename}` : '',
                body,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await recentlyCollection.insertOne(newItem);
            
            res.status(201).json({
                success: true,
                message: 'রিসেন্ট আইটেম সফলভাবে তৈরি হয়েছে',
                data: {
                    _id: result.insertedId,
                    ...newItem
                }
            });
        } catch (error) {
            // Delete uploaded file if error occurs
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            res.status(500).json({
                success: false,
                message: 'রিসেন্ট আইটেম তৈরি করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // UPDATE recent item with optional image upload
    router.put('/:id', upload.single('image'), async (req, res) => {
        try {
            const { title, body } = req.body;

            // Check if item exists
            const existingItem = await recentlyCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!existingItem) {
                // Delete uploaded file if item not found
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(404).json({
                    success: false,
                    message: 'রিসেন্ট আইটেম পাওয়া যায়নি'
                });
            }

            const updateData = {
                updatedAt: new Date()
            };

            if (title) updateData.title = title;
            if (body) updateData.body = body;

            // Handle image update
            if (req.file) {
                // Delete old image if exists
                if (existingItem.image) {
                    const oldImagePath = path.join(__dirname, '..', existingItem.image);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                    }
                }
                updateData.image = `/uploads/${req.file.filename}`;
            }

            const result = await recentlyCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: updateData }
            );

            res.json({
                success: true,
                message: 'রিসেন্ট আইটেম সফলভাবে আপডেট হয়েছে'
            });
        } catch (error) {
            // Delete uploaded file if error occurs
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            res.status(500).json({
                success: false,
                message: 'রিসেন্ট আইটেম আপডেট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // DELETE recent item (also delete all images in body content)
    router.delete('/:id', async (req, res) => {
        try {
            // Get item to delete associated images
            const item = await recentlyCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!item) {
                return res.status(404).json({
                    success: false,
                    message: 'রিসেন্ট আইটেম পাওয়া যায়নি'
                });
            }

            // Delete featured image file
            if (item.image) {
                const imagePath = path.join(__dirname, '..', item.image);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }

            // Delete images from body content
            if (item.body) {
                // Extract image URLs from body HTML
                const imgRegex = /<img[^>]+src="([^">]+)"/g;
                let match;
                while ((match = imgRegex.exec(item.body)) !== null) {
                    const imgUrl = match[1];
                    // Check if it's a local upload (not external URL or base64)
                    if (imgUrl.startsWith('/uploads/')) {
                        const imgPath = path.join(__dirname, '..', imgUrl);
                        if (fs.existsSync(imgPath)) {
                            fs.unlinkSync(imgPath);
                        }
                    }
                }
            }

            const result = await recentlyCollection.deleteOne({ 
                _id: new ObjectId(req.params.id) 
            });

            res.json({
                success: true,
                message: 'রিসেন্ট আইটেম সফলভাবে ডিলিট হয়েছে'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'রিসেন্ট আইটেম ডিলিট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // TOGGLE active status
    router.patch('/:id/toggle', async (req, res) => {
        try {
            const item = await recentlyCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!item) {
                return res.status(404).json({
                    success: false,
                    message: 'রিসেন্ট আইটেম পাওয়া যায়নি'
                });
            }

            const result = await recentlyCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { 
                    $set: { 
                        isActive: !item.isActive,
                        updatedAt: new Date()
                    } 
                }
            );

            res.json({
                success: true,
                message: `রিসেন্ট আইটেম ${!item.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে`,
                data: {
                    isActive: !item.isActive
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    return router;
};