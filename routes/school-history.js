const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const upload = require('../middleware/upload');
const fs = require('fs');
const path = require('path');

module.exports = (schoolHistoryCollection) => {

    // GET school history (only one document expected)
    router.get('/', async (req, res) => {
        try {
            // Get the first school history document
            const schoolHistory = await schoolHistoryCollection.findOne({});
            
            res.json({
                success: true,
                data: schoolHistory
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'স্কুল ইতিহাস লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // GET school history by ID
    router.get('/:id', async (req, res) => {
        try {
            // Validate ObjectId
            if (!ObjectId.isValid(req.params.id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ আইডি ফরম্যাট'
                });
            }

            const history = await schoolHistoryCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });
            
            if (!history) {
                return res.status(404).json({
                    success: false,
                    message: 'স্কুল ইতিহাস পাওয়া যায়নি'
                });
            }

            res.json({
                success: true,
                data: history
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'স্কুল ইতিহাস লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // CREATE school history
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

            // Check if school history already exists
            const existingHistory = await schoolHistoryCollection.findOne({});
            if (existingHistory) {
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(400).json({
                    success: false,
                    message: 'স্কুল ইতিহাস ইতিমধ্যে বিদ্যমান। আপডেট করুন।'
                });
            }

            const newHistory = {
                title,
                image: req.file ? `/uploads/${req.file.filename}` : '',
                body,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await schoolHistoryCollection.insertOne(newHistory);
            
            res.status(201).json({
                success: true,
                message: 'স্কুল ইতিহাস সফলভাবে তৈরি হয়েছে',
                data: {
                    _id: result.insertedId,
                    ...newHistory
                }
            });
        } catch (error) {
            // Delete uploaded file if error occurs
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            res.status(500).json({
                success: false,
                message: 'স্কুল ইতিহাস তৈরি করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // UPDATE school history
    router.put('/:id', upload.single('image'), async (req, res) => {
        try {
            const { title, body } = req.body;

            // Validate ObjectId
            if (!ObjectId.isValid(req.params.id)) {
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ আইডি ফরম্যাট'
                });
            }

            // Check if history exists
            const existingHistory = await schoolHistoryCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!existingHistory) {
                // Delete uploaded file if history not found
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(404).json({
                    success: false,
                    message: 'স্কুল ইতিহাস পাওয়া যায়নি'
                });
            }

            const updateData = {
                title,
                body,
                updatedAt: new Date()
            };

            // Handle image update
            if (req.file) {
                // Delete old image if exists
                if (existingHistory.image) {
                    const oldImagePath = path.join(__dirname, '..', existingHistory.image);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                    }
                }
                updateData.image = `/uploads/${req.file.filename}`;
            }

            const result = await schoolHistoryCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: updateData }
            );

            res.json({
                success: true,
                message: 'স্কুল ইতিহাস সফলভাবে আপডেট হয়েছে',
                data: updateData
            });
        } catch (error) {
            // Delete uploaded file if error occurs
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            res.status(500).json({
                success: false,
                message: 'স্কুল ইতিহাস আপডেট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // DELETE school history
    router.delete('/:id', async (req, res) => {
        try {
            // Validate ObjectId
            if (!ObjectId.isValid(req.params.id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ আইডি ফরম্যাট'
                });
            }

            // Get history to delete associated image
            const history = await schoolHistoryCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!history) {
                return res.status(404).json({
                    success: false,
                    message: 'স্কুল ইতিহাস পাওয়া যায়নি'
                });
            }

            // Delete image file
            if (history.image) {
                const imagePath = path.join(__dirname, '..', history.image);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }

            const result = await schoolHistoryCollection.deleteOne({ 
                _id: new ObjectId(req.params.id) 
            });

            res.json({
                success: true,
                message: 'স্কুল ইতিহাস সফলভাবে ডিলিট হয়েছে'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'স্কুল ইতিহাস ডিলিট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    return router;
};