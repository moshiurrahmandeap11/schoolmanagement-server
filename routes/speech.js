const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const upload = require('../middleware/upload');
const fs = require('fs');
const path = require('path');

module.exports = (speechCollection) => {

    // GET all speeches
    router.get('/', async (req, res) => {
        try {
            const speeches = await speechCollection.find().sort({ type: 1 }).toArray();
            res.json({
                success: true,
                data: speeches
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'স্পিচ লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // GET speech by ID
    router.get('/:id', async (req, res) => {
        try {
            const speech = await speechCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });
            
            if (!speech) {
                return res.status(404).json({
                    success: false,
                    message: 'স্পিচ পাওয়া যায়নি'
                });
            }

            res.json({
                success: true,
                data: speech
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'স্পিচ লোড করতে সমস্যা হয়েছে',
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

    // CREATE new speech with image upload
    router.post('/', upload.single('image'), async (req, res) => {
        try {
            const { type, body } = req.body;

            // Validation
            if (!type || !body) {
                // Delete uploaded file if validation fails
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(400).json({
                    success: false,
                    message: 'টাইপ এবং বডি আবশ্যক'
                });
            }

            // Check if speech type already exists
            const existingSpeech = await speechCollection.findOne({ type });
            if (existingSpeech) {
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(400).json({
                    success: false,
                    message: 'এই টাইপের স্পিচ ইতিমধ্যে বিদ্যমান'
                });
            }

            const newSpeech = {
                type,
                image: req.file ? `/uploads/${req.file.filename}` : '',
                body,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await speechCollection.insertOne(newSpeech);
            
            res.status(201).json({
                success: true,
                message: 'স্পিচ সফলভাবে তৈরি হয়েছে',
                data: {
                    _id: result.insertedId,
                    ...newSpeech
                }
            });
        } catch (error) {
            // Delete uploaded file if error occurs
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            res.status(500).json({
                success: false,
                message: 'স্পিচ তৈরি করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // UPDATE speech with optional image upload
    router.put('/:id', upload.single('image'), async (req, res) => {
        try {
            const { body } = req.body;

            // Check if speech exists
            const existingSpeech = await speechCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!existingSpeech) {
                // Delete uploaded file if speech not found
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(404).json({
                    success: false,
                    message: 'স্পিচ পাওয়া যায়নি'
                });
            }

            const updateData = {
                body,
                updatedAt: new Date()
            };

            // Handle image update
            if (req.file) {
                // Delete old image if exists
                if (existingSpeech.image) {
                    const oldImagePath = path.join(__dirname, '..', existingSpeech.image);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                    }
                }
                updateData.image = `/uploads/${req.file.filename}`;
            }

            const result = await speechCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: updateData }
            );

            res.json({
                success: true,
                message: 'স্পিচ সফলভাবে আপডেট হয়েছে',
                data: {
                    _id: req.params.id,
                    ...updateData
                }
            });
        } catch (error) {
            // Delete uploaded file if error occurs
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            res.status(500).json({
                success: false,
                message: 'স্পিচ আপডেট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // DELETE speech (also delete all images in body content)
    router.delete('/:id', async (req, res) => {
        try {
            // Get speech to delete associated images
            const speech = await speechCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!speech) {
                return res.status(404).json({
                    success: false,
                    message: 'স্পিচ পাওয়া যায়নি'
                    });
            }

            // Delete featured image file
            if (speech.image) {
                const imagePath = path.join(__dirname, '..', speech.image);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }

            // Delete images from body content
            if (speech.body) {
                // Extract image URLs from body HTML
                const imgRegex = /<img[^>]+src="([^">]+)"/g;
                let match;
                while ((match = imgRegex.exec(speech.body)) !== null) {
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

            const result = await speechCollection.deleteOne({ 
                _id: new ObjectId(req.params.id) 
            });

            res.json({
                success: true,
                message: 'স্পিচ সফলভাবে ডিলিট হয়েছে'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'স্পিচ ডিলিট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // TOGGLE active status
    router.patch('/:id/toggle', async (req, res) => {
        try {
            const speech = await speechCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!speech) {
                return res.status(404).json({
                    success: false,
                    message: 'স্পিচ পাওয়া যায়নি'
                });
            }

            const result = await speechCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { 
                    $set: { 
                        isActive: !speech.isActive,
                        updatedAt: new Date()
                    } 
                }
            );

            res.json({
                success: true,
                message: `স্পিচ ${!speech.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে`,
                data: {
                    isActive: !speech.isActive
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