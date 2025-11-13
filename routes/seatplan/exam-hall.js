const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const upload = require('../../middleware/upload');
const path = require('path');
const fs = require('fs');

module.exports = (examHallCollection) => {
    
    // GET all exam halls
    router.get('/', async (req, res) => {
        try {
            const examHalls = await examHallCollection.find().toArray();
            res.json({
                success: true,
                data: examHalls
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'এক্সাম হল লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // CREATE new exam hall with file upload
    router.post('/', upload.single('image'), async (req, res) => {
        try {
            const { name, rooms } = req.body;

            // Validation
            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: 'এক্সাম হলের নাম আবশ্যক'
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'ইমেজ ফাইল আবশ্যক'
                });
            }

            // Parse rooms if it's a string
            const roomsArray = typeof rooms === 'string' ? JSON.parse(rooms) : rooms;

            const newExamHall = {
                name,
                image: `/api/uploads/${req.file.filename}`,
                imageOriginalName: req.file.originalname,
                rooms: roomsArray,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await examHallCollection.insertOne(newExamHall);
            
            res.status(201).json({
                success: true,
                message: 'এক্সাম হল সফলভাবে তৈরি হয়েছে',
                data: {
                    _id: result.insertedId,
                    ...newExamHall
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'এক্সাম হল তৈরি করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // UPDATE exam hall
    router.put('/:id', upload.single('image'), async (req, res) => {
        try {
            const { id } = req.params;
            const { name, rooms } = req.body;

            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: 'এক্সাম হলের নাম আবশ্যক'
                });
            }

            const examHall = await examHallCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!examHall) {
                return res.status(404).json({
                    success: false,
                    message: 'এক্সাম হল পাওয়া যায়নি'
                });
            }

            const updateData = {
                name,
                rooms: typeof rooms === 'string' ? JSON.parse(rooms) : rooms,
                updatedAt: new Date()
            };

            // Add image if new one is uploaded
            if (req.file) {
                updateData.image = `/api/uploads/${req.file.filename}`;
                updateData.imageOriginalName = req.file.originalname;
                
                // Delete old image if exists
                if (examHall.image && examHall.image.startsWith('/api/uploads/')) {
                    const filename = examHall.image.replace('/api/uploads/', '');
                    const imagePath = path.join(__dirname, '..', 'uploads', filename);
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                    }
                }
            }

            const result = await examHallCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            res.json({
                success: true,
                message: 'এক্সাম হল সফলভাবে আপডেট হয়েছে',
                data: {
                    _id: id,
                    ...updateData
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'এক্সাম হল আপডেট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // DELETE exam hall
    router.delete('/:id', async (req, res) => {
        try {
            const examHall = await examHallCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!examHall) {
                return res.status(404).json({
                    success: false,
                    message: 'এক্সাম হল পাওয়া যায়নি'
                });
            }

            // Delete image file
            if (examHall.image && examHall.image.startsWith('/api/uploads/')) {
                const filename = examHall.image.replace('/api/uploads/', '');
                const imagePath = path.join(__dirname, '..', 'uploads', filename);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }

            const result = await examHallCollection.deleteOne({ 
                _id: new ObjectId(req.params.id) 
            });

            res.json({
                success: true,
                message: 'এক্সাম হল সফলভাবে ডিলিট হয়েছে'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'এক্সাম হল ডিলিট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    return router;
};