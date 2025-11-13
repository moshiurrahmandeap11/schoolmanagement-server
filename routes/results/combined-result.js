const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (combinedResultCollection) => {
    
    // GET all combined results
    router.get('/', async (req, res) => {
        try {
            const combinedResults = await combinedResultCollection.find().sort({ createdAt: -1 }).toArray();
            res.json({
                success: true,
                data: combinedResults
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'কম্বাইন্ড রেজাল্ট লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // CREATE combined result
    router.post('/', async (req, res) => {
        try {
            const { name, description, selectedResults, examCategories } = req.body;

            // Validation
            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: 'কম্বাইন্ড রেজাল্টের নাম আবশ্যক'
                });
            }

            if (!selectedResults || selectedResults.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'অন্তত একটি রেজাল্ট সিলেক্ট করুন'
                });
            }

            if (!examCategories || examCategories.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'অন্তত একটি এক্সাম ক্যাটাগরি সিলেক্ট করুন'
                });
            }

            const newCombinedResult = {
                name,
                description: description || '',
                selectedResults: selectedResults,
                examCategories: examCategories,
                totalResults: selectedResults.length,
                totalExamCategories: examCategories.length,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await combinedResultCollection.insertOne(newCombinedResult);
            
            res.status(201).json({
                success: true,
                message: 'কম্বাইন্ড রেজাল্ট সফলভাবে তৈরি হয়েছে',
                data: {
                    _id: result.insertedId,
                    ...newCombinedResult
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'কম্বাইন্ড রেজাল্ট তৈরি করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // DELETE combined result
    router.delete('/:id', async (req, res) => {
        try {
            const combinedResult = await combinedResultCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!combinedResult) {
                return res.status(404).json({
                    success: false,
                    message: 'কম্বাইন্ড রেজাল্ট পাওয়া যায়নি'
                });
            }

            const result = await combinedResultCollection.deleteOne({ 
                _id: new ObjectId(req.params.id) 
            });

            res.json({
                success: true,
                message: 'কম্বাইন্ড রেজাল্ট সফলভাবে ডিলিট হয়েছে'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'কম্বাইন্ড রেজাল্ট ডিলিট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    return router;
};