const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (pagesCollection) => {
    
    // ✅ GET all pages
    router.get('/', async (req, res) => {
        try {
            const pages = await pagesCollection.find().sort({ createdAt: -1 }).toArray();
            res.json({
                success: true,
                data: pages
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'পৃষ্ঠা লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ✅ GET single page by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ পৃষ্ঠা আইডি'
                });
            }

            const page = await pagesCollection.findOne({ _id: new ObjectId(id) });

            if (!page) {
                return res.status(404).json({
                    success: false,
                    message: 'পৃষ্ঠা পাওয়া যায়নি'
                });
            }

            res.json({
                success: true,
                data: page
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'পৃষ্ঠা ডেটা আনতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ✅ CREATE new page
    router.post('/', async (req, res) => {
        try {
            const { name, description, data } = req.body;

            if (!name || !data) {
                return res.status(400).json({
                    success: false,
                    message: 'পৃষ্ঠা নাম এবং কন্টেন্ট আবশ্যক'
                });
            }

            // Check if page name already exists
            const existingPage = await pagesCollection.findOne({ 
                name: { $regex: new RegExp(`^${name}$`, 'i') } 
            });

            if (existingPage) {
                return res.status(400).json({
                    success: false,
                    message: 'এই নামের পৃষ্ঠা ইতিমধ্যে存在'
                });
            }

            const newPage = {
                name: name.trim(),
                description: description || '',
                data: data,
                slug: name.trim().toLowerCase().replace(/\s+/g, '-'),
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await pagesCollection.insertOne(newPage);

            res.status(201).json({
                success: true,
                message: 'পৃষ্ঠা সফলভাবে তৈরি হয়েছে',
                data: {
                    _id: result.insertedId,
                    ...newPage
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'পৃষ্ঠা তৈরি করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ✅ UPDATE page
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { name, description, data } = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ পৃষ্ঠা আইডি'
                });
            }

            const existingPage = await pagesCollection.findOne({ _id: new ObjectId(id) });
            if (!existingPage) {
                return res.status(404).json({
                    success: false,
                    message: 'পৃষ্ঠা পাওয়া যায়নি'
                });
            }

            // Check if page name already exists (excluding current page)
            if (name && name !== existingPage.name) {
                const duplicatePage = await pagesCollection.findOne({ 
                    name: { $regex: new RegExp(`^${name}$`, 'i') },
                    _id: { $ne: new ObjectId(id) }
                });

                if (duplicatePage) {
                    return res.status(400).json({
                        success: false,
                        message: 'এই নামের পৃষ্ঠা ইতিমধ্যে存在'
                    });
                }
            }

            const updatedData = {
                name: name || existingPage.name,
                description: description || existingPage.description,
                data: data || existingPage.data,
                slug: name ? name.trim().toLowerCase().replace(/\s+/g, '-') : existingPage.slug,
                updatedAt: new Date()
            };

            await pagesCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedData }
            );

            res.json({
                success: true,
                message: 'পৃষ্ঠা সফলভাবে আপডেট হয়েছে',
                data: updatedData
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'পৃষ্ঠা আপডেট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ✅ DELETE page
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ পৃষ্ঠা আইডি'
                });
            }

            const page = await pagesCollection.findOne({ _id: new ObjectId(id) });

            if (!page) {
                return res.status(404).json({
                    success: false,
                    message: 'পৃষ্ঠা পাওয়া যায়নি'
                });
            }

            await pagesCollection.deleteOne({ _id: new ObjectId(id) });

            res.json({
                success: true,
                message: 'পৃষ্ঠা সফলভাবে ডিলিট হয়েছে'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'পৃষ্ঠা ডিলিট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ✅ TOGGLE page active status
    router.patch('/:id/toggle', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ পৃষ্ঠা আইডি'
                });
            }

            const page = await pagesCollection.findOne({ _id: new ObjectId(id) });

            if (!page) {
                return res.status(404).json({
                    success: false,
                    message: 'পৃষ্ঠা পাওয়া যায়নি'
                });
            }

            const updatedStatus = !page.isActive;
            await pagesCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { isActive: updatedStatus, updatedAt: new Date() } }
            );

            res.json({
                success: true,
                message: `পৃষ্ঠা ${updatedStatus ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে`,
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

    // ✅ GET page by slug
    router.get('/slug/:slug', async (req, res) => {
        try {
            const { slug } = req.params;

            const page = await pagesCollection.findOne({ 
                slug: slug,
                isActive: true 
            });

            if (!page) {
                return res.status(404).json({
                    success: false,
                    message: 'পৃষ্ঠা পাওয়া যায়নি'
                });
            }

            res.json({
                success: true,
                data: page
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'পৃষ্ঠা ডেটা আনতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    return router;
};