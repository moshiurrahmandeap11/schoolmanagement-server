const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (facultyCollection) => {
    
    // GET all faculties
    router.get('/', async (req, res) => {
        try {
            const faculties = await facultyCollection.find({})
                .sort({ createdAt: -1 })
                .toArray();
                
            res.status(200).json({
                success: true,
                data: faculties
            });
        } catch (error) {
            console.error('Error fetching faculties:', error);
            res.status(500).json({
                success: false,
                message: 'ফ্যাকাল্টি লোড করতে সমস্যা হয়েছে'
            });
        }
    });

    // GET single faculty by ID
    router.get('/:id', async (req, res) => {
        try {
            const faculty = await facultyCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });
            
            if (!faculty) {
                return res.status(404).json({
                    success: false,
                    message: 'ফ্যাকাল্টি পাওয়া যায়নি'
                });
            }
            
            res.status(200).json({
                success: true,
                data: faculty
            });
        } catch (error) {
            console.error('Error fetching faculty:', error);
            res.status(500).json({
                success: false,
                message: 'ফ্যাকাল্টি লোড করতে সমস্যা হয়েছে'
            });
        }
    });

    // POST create new faculty
    router.post('/', async (req, res) => {
        try {
            const { name, description } = req.body;

            // Validation
            if (!name || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'ফ্যাকাল্টি নাম প্রয়োজন'
                });
            }

            if (!description || !description.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'বিবরণ প্রয়োজন'
                });
            }

            // Check if faculty already exists
            const existingFaculty = await facultyCollection.findOne({ 
                name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } 
            });

            if (existingFaculty) {
                return res.status(400).json({
                    success: false,
                    message: 'এই নামের ফ্যাকাল্টি ইতিমধ্যে存在'
                });
            }

            const facultyData = {
                name: name.trim(),
                description: description.trim(),
                slug: name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, ''),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await facultyCollection.insertOne(facultyData);

            res.status(201).json({
                success: true,
                message: 'ফ্যাকাল্টি সফলভাবে তৈরি হয়েছে',
                data: {
                    _id: result.insertedId,
                    ...facultyData
                }
            });
        } catch (error) {
            console.error('Error creating faculty:', error);
            res.status(500).json({
                success: false,
                message: 'ফ্যাকাল্টি তৈরি করতে সমস্যা হয়েছে'
            });
        }
    });

    // PUT update faculty
    router.put('/:id', async (req, res) => {
        try {
            const { name, description } = req.body;

            // Validation
            if (!name || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'ফ্যাকাল্টি নাম প্রয়োজন'
                });
            }

            if (!description || !description.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'বিবরণ প্রয়োজন'
                });
            }

            // Check if faculty already exists (excluding current faculty)
            const existingFaculty = await facultyCollection.findOne({ 
                name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
                _id: { $ne: new ObjectId(req.params.id) }
            });

            if (existingFaculty) {
                return res.status(400).json({
                    success: false,
                    message: 'এই নামের ফ্যাকাল্টি ইতিমধ্যে存在'
                });
            }

            const updateData = {
                name: name.trim(),
                description: description.trim(),
                slug: name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, ''),
                updatedAt: new Date()
            };

            const result = await facultyCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: updateData }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'ফ্যাকাল্টি পাওয়া যায়নি'
                });
            }

            res.status(200).json({
                success: true,
                message: 'ফ্যাকাল্টি সফলভাবে আপডেট হয়েছে'
            });
        } catch (error) {
            console.error('Error updating faculty:', error);
            res.status(500).json({
                success: false,
                message: 'ফ্যাকাল্টি আপডেট করতে সমস্যা হয়েছে'
            });
        }
    });

    // DELETE faculty
    router.delete('/:id', async (req, res) => {
        try {
            const result = await facultyCollection.deleteOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'ফ্যাকাল্টি পাওয়া যায়নি'
                });
            }

            res.status(200).json({
                success: true,
                message: 'ফ্যাকাল্টি সফলভাবে ডিলিট হয়েছে'
            });
        } catch (error) {
            console.error('Error deleting faculty:', error);
            res.status(500).json({
                success: false,
                message: 'ফ্যাকাল্টি ডিলিট করতে সমস্যা হয়েছে'
            });
        }
    });

    // GET faculty count
    router.get('/count/total', async (req, res) => {
        try {
            const totalCount = await facultyCollection.countDocuments();
            res.status(200).json({
                success: true,
                data: { total: totalCount }
            });
        } catch (error) {
            console.error('Error counting faculties:', error);
            res.status(500).json({
                success: false,
                message: 'ফ্যাকাল্টি কাউন্ট করতে সমস্যা হয়েছে'
            });
        }
    });

    return router;
};