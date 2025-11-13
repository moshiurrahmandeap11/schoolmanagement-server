const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (examArrangementCollection) => {
    
    // GET all seat arrangements
    router.get('/', async (req, res) => {
        try {
            const arrangements = await examArrangementCollection.find().sort({ createdAt: -1 }).toArray();
            res.json({
                success: true,
                data: arrangements
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'আসল পরিকল্পনা লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // CREATE new seat arrangement
    router.post('/', async (req, res) => {
        try {
            const {
                className,
                batch,
                section,
                activeSession,
                monthlyFee,
                sendAttendanceSMS,
                hallRoom,
                exam,
                examDuration,
                columnNumber,
                rowNumber,
                studentsPerBench
            } = req.body;

            // Validation
            const requiredFields = [
                'className', 'batch', 'section', 'activeSession', 
                'hallRoom', 'exam', 'examDuration', 'columnNumber', 
                'rowNumber', 'studentsPerBench'
            ];

            for (const field of requiredFields) {
                if (!req.body[field]) {
                    return res.status(400).json({
                        success: false,
                        message: `${field} আবশ্যক`
                    });
                }
            }

            const newArrangement = {
                className,
                batch,
                section,
                activeSession,
                monthlyFee: monthlyFee || 0,
                sendAttendanceSMS: sendAttendanceSMS !== undefined ? JSON.parse(sendAttendanceSMS) : false,
                hallRoom,
                exam,
                examDuration,
                columnNumber: parseInt(columnNumber),
                rowNumber: parseInt(rowNumber),
                studentsPerBench: parseInt(studentsPerBench),
                totalSeats: parseInt(columnNumber) * parseInt(rowNumber) * parseInt(studentsPerBench),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await examArrangementCollection.insertOne(newArrangement);
            
            res.status(201).json({
                success: true,
                message: 'আসল পরিকল্পনা সফলভাবে তৈরি হয়েছে',
                data: {
                    _id: result.insertedId,
                    ...newArrangement
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'আসল পরিকল্পনা তৈরি করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // UPDATE seat arrangement
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const {
                className,
                batch,
                section,
                activeSession,
                monthlyFee,
                sendAttendanceSMS,
                hallRoom,
                exam,
                examDuration,
                columnNumber,
                rowNumber,
                studentsPerBench
            } = req.body;

            const arrangement = await examArrangementCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!arrangement) {
                return res.status(404).json({
                    success: false,
                    message: 'আসল পরিকল্পনা পাওয়া যায়নি'
                });
            }

            const updateData = {
                className,
                batch,
                section,
                activeSession,
                monthlyFee: monthlyFee || 0,
                sendAttendanceSMS: sendAttendanceSMS !== undefined ? JSON.parse(sendAttendanceSMS) : false,
                hallRoom,
                exam,
                examDuration,
                columnNumber: parseInt(columnNumber),
                rowNumber: parseInt(rowNumber),
                studentsPerBench: parseInt(studentsPerBench),
                totalSeats: parseInt(columnNumber) * parseInt(rowNumber) * parseInt(studentsPerBench),
                updatedAt: new Date()
            };

            const result = await examArrangementCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            res.json({
                success: true,
                message: 'আসল পরিকল্পনা সফলভাবে আপডেট হয়েছে',
                data: {
                    _id: id,
                    ...updateData
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'আসল পরিকল্পনা আপডেট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // DELETE seat arrangement
    router.delete('/:id', async (req, res) => {
        try {
            const arrangement = await examArrangementCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!arrangement) {
                return res.status(404).json({
                    success: false,
                    message: 'আসল পরিকল্পনা পাওয়া যায়নি'
                });
            }

            const result = await examArrangementCollection.deleteOne({ 
                _id: new ObjectId(req.params.id) 
            });

            res.json({
                success: true,
                message: 'আসল পরিকল্পনা সফলভাবে ডিলিট হয়েছে'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'আসল পরিকল্পনা ডিলিট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    return router;
};