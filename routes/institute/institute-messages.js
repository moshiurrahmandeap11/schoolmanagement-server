const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const upload = require('../../middleware/upload');

module.exports = (instituteMessageCollection) => {
    
    // GET all institute messages
    router.get('/', async (req, res) => {
        try {
            const messages = await instituteMessageCollection.find().sort({ createdAt: -1 }).toArray();
            res.json({
                success: true,
                data: messages
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ইনস্টিটিউট বার্তা লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // CREATE new institute message
    router.post('/', upload.single('image'), async (req, res) => {
        try {
            const { teacherName, designation, description, featured } = req.body;

            // Validation
            if (!teacherName) {
                return res.status(400).json({
                    success: false,
                    message: 'শিক্ষকের নাম প্রয়োজন'
                });
            }

            if (!designation) {
                return res.status(400).json({
                    success: false,
                    message: 'পদবী প্রয়োজন'
                });
            }

            if (!description || !description.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'বিবরণ প্রয়োজন'
                });
            }

            const newMessage = {
                teacherName,
                designation,
                description: description.trim(),
                image: req.file ? `/api/uploads/${req.file.filename}` : null,
                imageOriginalName: req.file ? req.file.originalname : null,
                featured: featured !== undefined ? JSON.parse(featured) : false,
                status: 'active',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await instituteMessageCollection.insertOne(newMessage);
            
            res.status(201).json({
                success: true,
                message: 'ইনস্টিটিউট বার্তা সফলভাবে তৈরি হয়েছে',
                data: {
                    _id: result.insertedId,
                    ...newMessage
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ইনস্টিটিউট বার্তা তৈরি করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // UPDATE institute message
    router.put('/:id', upload.single('image'), async (req, res) => {
        try {
            const { id } = req.params;
            const { teacherName, designation, description, featured } = req.body;

            const message = await instituteMessageCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!message) {
                return res.status(404).json({
                    success: false,
                    message: 'ইনস্টিটিউট বার্তা পাওয়া যায়নি'
                });
            }

            const updateData = {
                teacherName,
                designation,
                description: description.trim(),
                featured: featured !== undefined ? JSON.parse(featured) : false,
                updatedAt: new Date()
            };

            // Add new image if uploaded
            if (req.file) {
                updateData.image = `/api/uploads/${req.file.filename}`;
                updateData.imageOriginalName = req.file.originalname;
                
                // Delete old image if exists
                if (message.image && message.image.startsWith('/api/uploads/')) {
                    const fs = require('fs');
                    const path = require('path');
                    const filename = message.image.replace('/api/uploads/', '');
                    const imagePath = path.join(__dirname, '..', 'uploads', filename);
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                    }
                }
            }

            const result = await instituteMessageCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            res.json({
                success: true,
                message: 'ইনস্টিটিউট বার্তা সফলভাবে আপডেট হয়েছে',
                data: {
                    _id: id,
                    ...updateData
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ইনস্টিটিউট বার্তা আপডেট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // DELETE institute message
    router.delete('/:id', async (req, res) => {
        try {
            const message = await instituteMessageCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!message) {
                return res.status(404).json({
                    success: false,
                    message: 'ইনস্টিটিউট বার্তা পাওয়া যায়নি'
                });
            }

            // Delete image if exists
            if (message.image && message.image.startsWith('/api/uploads/')) {
                const fs = require('fs');
                const path = require('path');
                const filename = message.image.replace('/api/uploads/', '');
                const imagePath = path.join(__dirname, '..', 'uploads', filename);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }

            const result = await instituteMessageCollection.deleteOne({ 
                _id: new ObjectId(req.params.id) 
            });

            res.json({
                success: true,
                message: 'ইনস্টিটিউট বার্তা সফলভাবে ডিলিট হয়েছে'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ইনস্টিটিউট বার্তা ডিলিট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // TOGGLE featured status
    router.patch('/:id/toggle-featured', async (req, res) => {
        try {
            const message = await instituteMessageCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!message) {
                return res.status(404).json({
                    success: false,
                    message: 'ইনস্টিটিউট বার্তা পাওয়া যায়নি'
                });
            }

            const result = await instituteMessageCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { 
                    $set: { 
                        featured: !message.featured,
                        updatedAt: new Date()
                    } 
                }
            );

            res.json({
                success: true,
                message: `বার্তা ${!message.featured ? 'ফিচার্ড' : 'ফিচার্ড নয়'} করা হয়েছে`,
                data: {
                    featured: !message.featured
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ফিচার্ড স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // TOGGLE active status
    router.patch('/:id/toggle-status', async (req, res) => {
        try {
            const message = await instituteMessageCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!message) {
                return res.status(404).json({
                    success: false,
                    message: 'ইনস্টিটিউট বার্তা পাওয়া যায়নি'
                });
            }

            const newStatus = message.status === 'active' ? 'inactive' : 'active';

            const result = await instituteMessageCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { 
                    $set: { 
                        status: newStatus,
                        updatedAt: new Date()
                    } 
                }
            );

            res.json({
                success: true,
                message: `বার্তা ${newStatus === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে`,
                data: {
                    status: newStatus
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