const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (classesCollection) => {

    // GET all classes
    router.get('/', async (req, res) => {
        try {
            const classes = await classesCollection.find().sort({ name: 1 }).toArray();
            res.json({
                success: true,
                data: classes
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ক্লাস লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // CREATE new class
    router.post('/', async (req, res) => {
        try {
            const { name } = req.body;

            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: 'ক্লাসের নাম আবশ্যক'
                });
            }

            // Check if class already exists
            const existingClass = await classesCollection.findOne({ name });
            if (existingClass) {
                return res.status(400).json({
                    success: false,
                    message: 'এই ক্লাস ইতিমধ্যে বিদ্যমান'
                });
            }

            const newClass = {
                name,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await classesCollection.insertOne(newClass);
            
            res.status(201).json({
                success: true,
                message: 'ক্লাস সফলভাবে তৈরি হয়েছে',
                data: {
                    _id: result.insertedId,
                    ...newClass
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ক্লাস তৈরি করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    return router;
};