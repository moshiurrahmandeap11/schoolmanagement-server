const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (examTimeTableCollection) => {
    
    // GET all exam timetables
    router.get('/', async (req, res) => {
        try {
            const examTimetables = await examTimeTableCollection.find().sort({ createdAt: -1 }).toArray();
            res.json({
                success: true,
                data: examTimetables
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'পরীক্ষার সময়সূচী লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // CREATE new exam timetable
    router.post('/', async (req, res) => {
        try {
            const { duration, status } = req.body;

            // Validation
            if (!duration) {
                return res.status(400).json({
                    success: false,
                    message: 'সময়কাল আবশ্যক'
                });
            }

            if (!status) {
                return res.status(400).json({
                    success: false,
                    message: 'অবস্থান আবশ্যক'
                });
            }

            const newExamTimetable = {
                duration,
                status,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await examTimeTableCollection.insertOne(newExamTimetable);
            
            res.status(201).json({
                success: true,
                message: 'পরীক্ষার সময়সূচী সফলভাবে তৈরি হয়েছে',
                data: {
                    _id: result.insertedId,
                    ...newExamTimetable
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'পরীক্ষার সময়সূচী তৈরি করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // UPDATE exam timetable
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { duration, status } = req.body;

            if (!duration) {
                return res.status(400).json({
                    success: false,
                    message: 'সময়কাল আবশ্যক'
                });
            }

            if (!status) {
                return res.status(400).json({
                    success: false,
                    message: 'অবস্থান আবশ্যক'
                });
            }

            const examTimetable = await examTimeTableCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!examTimetable) {
                return res.status(404).json({
                    success: false,
                    message: 'পরীক্ষার সময়সূচী পাওয়া যায়নি'
                });
            }

            const updateData = {
                duration,
                status,
                updatedAt: new Date()
            };

            const result = await examTimeTableCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            res.json({
                success: true,
                message: 'পরীক্ষার সময়সূচী সফলভাবে আপডেট হয়েছে',
                data: {
                    _id: id,
                    ...updateData
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'পরীক্ষার সময়সূচী আপডেট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // DELETE exam timetable
    router.delete('/:id', async (req, res) => {
        try {
            const examTimetable = await examTimeTableCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!examTimetable) {
                return res.status(404).json({
                    success: false,
                    message: 'পরীক্ষার সময়সূচী পাওয়া যায়নি'
                });
            }

            const result = await examTimeTableCollection.deleteOne({ 
                _id: new ObjectId(req.params.id) 
            });

            res.json({
                success: true,
                message: 'পরীক্ষার সময়সূচী সফলভাবে ডিলিট হয়েছে'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'পরীক্ষার সময়সূচী ডিলিট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // TOGGLE status
    router.patch('/:id/toggle-status', async (req, res) => {
        try {
            const examTimetable = await examTimeTableCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!examTimetable) {
                return res.status(404).json({
                    success: false,
                    message: 'পরীক্ষার সময়সূচী পাওয়া যায়নি'
                });
            }

            const newStatus = examTimetable.status === 'active' ? 'inactive' : 'active';

            const result = await examTimeTableCollection.updateOne(
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
                message: `পরীক্ষার সময়সূচী ${newStatus === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে`,
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