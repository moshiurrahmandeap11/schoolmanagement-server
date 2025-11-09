const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (documentCategoryCollection) => {
    
    // ✅ GET all document categories
    router.get('/', async (req, res) => {
        try {
            const categories = await documentCategoryCollection.find().sort({ createdAt: -1 }).toArray();
            res.json({
                success: true,
                data: categories
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ক্যাটাগরী লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ✅ GET single category by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ ক্যাটাগরী আইডি'
                });
            }

            const category = await documentCategoryCollection.findOne({ _id: new ObjectId(id) });

            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'ক্যাটাগরী পাওয়া যায়নি'
                });
            }

            res.json({
                success: true,
                data: category
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ক্যাটাগরী ডেটা আনতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ✅ CREATE new document category
    router.post('/', async (req, res) => {
        try {
            const { categories } = req.body;

            if (!categories || !Array.isArray(categories) || categories.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'ক্যাটাগরী ডেটা আবশ্যক'
                });
            }

            // Check for duplicate category names
            const categoryNames = categories.map(cat => cat.name.trim().toLowerCase());
            const uniqueNames = new Set(categoryNames);
            
            if (categoryNames.length !== uniqueNames.size) {
                return res.status(400).json({
                    success: false,
                    message: 'ডুপ্লিকেট ক্যাটাগরী নাম পাওয়া গেছে'
                });
            }

            // Check if any category name already exists in database
            for (const category of categories) {
                const existingCategory = await documentCategoryCollection.findOne({ 
                    name: { $regex: new RegExp(`^${category.name}$`, 'i') } 
                });

                if (existingCategory) {
                    return res.status(400).json({
                        success: false,
                        message: `"${category.name}" নামের ক্যাটাগরী ইতিমধ্যে存在`
                    });
                }
            }

            const categoriesToInsert = categories.map(category => ({
                name: category.name.trim(),
                description: category.description || '',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            }));

            const result = await documentCategoryCollection.insertMany(categoriesToInsert);

            res.status(201).json({
                success: true,
                message: `${categories.length}টি ক্যাটাগরী সফলভাবে তৈরি হয়েছে`,
                data: {
                    insertedIds: result.insertedIds,
                    categories: categoriesToInsert
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ক্যাটাগরী তৈরি করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ✅ UPDATE document category
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { name, description } = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ ক্যাটাগরী আইডি'
                });
            }

            const existingCategory = await documentCategoryCollection.findOne({ _id: new ObjectId(id) });
            if (!existingCategory) {
                return res.status(404).json({
                    success: false,
                    message: 'ক্যাটাগরী পাওয়া যায়নি'
                });
            }

            // Check if category name already exists (excluding current category)
            if (name && name !== existingCategory.name) {
                const duplicateCategory = await documentCategoryCollection.findOne({ 
                    name: { $regex: new RegExp(`^${name}$`, 'i') },
                    _id: { $ne: new ObjectId(id) }
                });

                if (duplicateCategory) {
                    return res.status(400).json({
                        success: false,
                        message: 'এই নামের ক্যাটাগরী ইতিমধ্যে存在'
                    });
                }
            }

            const updatedData = {
                name: name || existingCategory.name,
                description: description || existingCategory.description,
                updatedAt: new Date()
            };

            await documentCategoryCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedData }
            );

            res.json({
                success: true,
                message: 'ক্যাটাগরী সফলভাবে আপডেট হয়েছে',
                data: updatedData
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ক্যাটাগরী আপডেট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ✅ DELETE document category
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ ক্যাটাগরী আইডি'
                });
            }

            const category = await documentCategoryCollection.findOne({ _id: new ObjectId(id) });

            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'ক্যাটাগরী পাওয়া যায়নি'
                });
            }

            await documentCategoryCollection.deleteOne({ _id: new ObjectId(id) });

            res.json({
                success: true,
                message: 'ক্যাটাগরী সফলভাবে ডিলিট হয়েছে'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ক্যাটাগরী ডিলিট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ✅ TOGGLE category active status
    router.patch('/:id/toggle', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ ক্যাটাগরী আইডি'
                });
            }

            const category = await documentCategoryCollection.findOne({ _id: new ObjectId(id) });

            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'ক্যাটাগরী পাওয়া যায়নি'
                });
            }

            const updatedStatus = !category.isActive;
            await documentCategoryCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { isActive: updatedStatus, updatedAt: new Date() } }
            );

            res.json({
                success: true,
                message: `ক্যাটাগরী ${updatedStatus ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে`,
                data: { isActive: updatedStatus }
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