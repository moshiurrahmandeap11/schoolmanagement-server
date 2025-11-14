const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (blogCategoryCollection) => {
    
    // GET all blog categories
    router.get('/', async (req, res) => {
        try {
            const categories = await blogCategoryCollection.find({}).sort({ createdAt: -1 }).toArray();
            res.status(200).json({
                success: true,
                data: categories
            });
        } catch (error) {
            console.error('Error fetching blog categories:', error);
            res.status(500).json({
                success: false,
                message: 'ব্লগ ক্যাটাগরি লোড করতে সমস্যা হয়েছে'
            });
        }
    });

    // GET single category by ID
    router.get('/:id', async (req, res) => {
        try {
            const category = await blogCategoryCollection.findOne({ _id: new ObjectId(req.params.id) });
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'ক্যাটাগরি পাওয়া যায়নি'
                });
            }
            res.status(200).json({
                success: true,
                data: category
            });
        } catch (error) {
            console.error('Error fetching category:', error);
            res.status(500).json({
                success: false,
                message: 'ক্যাটাগরি লোড করতে সমস্যা হয়েছে'
            });
        }
    });

    // POST create new category
    router.post('/', async (req, res) => {
        try {
            const { name } = req.body;

            // Validation
            if (!name || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'ক্যাটাগরি নাম প্রয়োজন'
                });
            }

            // Check if category already exists
            const existingCategory = await blogCategoryCollection.findOne({ 
                name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } 
            });

            if (existingCategory) {
                return res.status(400).json({
                    success: false,
                    message: 'এই নামের ক্যাটাগরি ইতিমধ্যে存在'
                });
            }

            const categoryData = {
                name: name.trim(),
                slug: name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, ''),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await blogCategoryCollection.insertOne(categoryData);

            res.status(201).json({
                success: true,
                message: 'ব্লগ ক্যাটাগরি সফলভাবে তৈরি হয়েছে',
                data: {
                    _id: result.insertedId,
                    ...categoryData
                }
            });
        } catch (error) {
            console.error('Error creating category:', error);
            res.status(500).json({
                success: false,
                message: 'ব্লগ ক্যাটাগরি তৈরি করতে সমস্যা হয়েছে'
            });
        }
    });

    // PUT update category
    router.put('/:id', async (req, res) => {
        try {
            const { name } = req.body;

            // Validation
            if (!name || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'ক্যাটাগরি নাম প্রয়োজন'
                });
            }

            // Check if category already exists (excluding current category)
            const existingCategory = await blogCategoryCollection.findOne({ 
                name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
                _id: { $ne: new ObjectId(req.params.id) }
            });

            if (existingCategory) {
                return res.status(400).json({
                    success: false,
                    message: 'এই নামের ক্যাটাগরি ইতিমধ্যে存在'
                });
            }

            const updateData = {
                name: name.trim(),
                slug: name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, ''),
                updatedAt: new Date()
            };

            const result = await blogCategoryCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: updateData }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'ক্যাটাগরি পাওয়া যায়নি'
                });
            }

            res.status(200).json({
                success: true,
                message: 'ব্লগ ক্যাটাগরি সফলভাবে আপডেট হয়েছে'
            });
        } catch (error) {
            console.error('Error updating category:', error);
            res.status(500).json({
                success: false,
                message: 'ব্লগ ক্যাটাগরি আপডেট করতে সমস্যা হয়েছে'
            });
        }
    });

    // DELETE category
    router.delete('/:id', async (req, res) => {
        try {
            const result = await blogCategoryCollection.deleteOne({ _id: new ObjectId(req.params.id) });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'ক্যাটাগরি পাওয়া যায়নি'
                });
            }

            res.status(200).json({
                success: true,
                message: 'ব্লগ ক্যাটাগরি সফলভাবে ডিলিট হয়েছে'
            });
        } catch (error) {
            console.error('Error deleting category:', error);
            res.status(500).json({
                success: false,
                message: 'ব্লগ ক্যাটাগরি ডিলিট করতে সমস্যা হয়েছে'
            });
        }
    });

    // GET category count
    router.get('/count/total', async (req, res) => {
        try {
            const totalCount = await blogCategoryCollection.countDocuments();
            res.status(200).json({
                success: true,
                data: { total: totalCount }
            });
        } catch (error) {
            console.error('Error counting categories:', error);
            res.status(500).json({
                success: false,
                message: 'ক্যাটাগরি কাউন্ট করতে সমস্যা হয়েছে'
            });
        }
    });

    return router;
};