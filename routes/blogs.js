const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

module.exports = (blogsCollection) => {
    // ✅ GET all blogs
    router.get('/', async (req, res) => {
        try {
            const blogs = await blogsCollection.find().sort({ createdAt: -1 }).toArray();
            res.json({
                success: true,
                data: blogs
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ব্লগ লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ✅ 🆕 GET single blog by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ ব্লগ আইডি'
                });
            }

            const blog = await blogsCollection.findOne({ _id: new ObjectId(id) });

            if (!blog) {
                return res.status(404).json({
                    success: false,
                    message: 'ব্লগ পাওয়া যায়নি'
                });
            }

            res.json({
                success: true,
                data: blog
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ব্লগ ডেটা আনতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ✅ CREATE new blog
    router.post('/', upload.single('thumbnail'), async (req, res) => {
        try {
            const { title, body, author, isActive } = req.body;

            if (!title || !body) {
                return res.status(400).json({
                    success: false,
                    message: 'টাইটেল ও কনটেন্ট আবশ্যক'
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'থাম্বনেইল ইমেজ আবশ্যক'
                });
            }

            const newBlog = {
                title,
                body,
                author: author || 'Unknown',
                thumbnail: `/api/uploads/${req.file.filename}`,
                originalFileName: req.file.originalname,
                isActive: isActive !== undefined ? JSON.parse(isActive) : true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await blogsCollection.insertOne(newBlog);

            res.status(201).json({
                success: true,
                message: 'ব্লগ সফলভাবে তৈরি হয়েছে',
                data: {
                    _id: result.insertedId,
                    ...newBlog
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ব্লগ তৈরি করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ✅ UPDATE blog
    router.put('/:id', upload.single('thumbnail'), async (req, res) => {
        try {
            const { id } = req.params;
            const { title, body, isActive } = req.body;

            const existingBlog = await blogsCollection.findOne({ _id: new ObjectId(id) });
            if (!existingBlog) {
                return res.status(404).json({
                    success: false,
                    message: 'ব্লগ পাওয়া যায়নি'
                });
            }

            let updatedThumbnail = existingBlog.thumbnail;
            if (req.file) {
                if (existingBlog.thumbnail && existingBlog.thumbnail.startsWith('/api/uploads/')) {
                    const oldFile = existingBlog.thumbnail.replace('/api/uploads/', '');
                    const oldPath = path.join(__dirname, '..', 'uploads', oldFile);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }
                updatedThumbnail = `/api/uploads/${req.file.filename}`;
            }

            const updatedData = {
                title: title || existingBlog.title,
                body: body || existingBlog.body,
                isActive: isActive !== undefined ? JSON.parse(isActive) : existingBlog.isActive,
                thumbnail: updatedThumbnail,
                updatedAt: new Date()
            };

            await blogsCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedData }
            );

            res.json({
                success: true,
                message: 'ব্লগ সফলভাবে আপডেট হয়েছে'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ব্লগ আপডেট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ✅ DELETE blog
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const blog = await blogsCollection.findOne({ _id: new ObjectId(id) });

            if (!blog) {
                return res.status(404).json({
                    success: false,
                    message: 'ব্লগ পাওয়া যায়নি'
                });
            }

            if (blog.thumbnail && blog.thumbnail.startsWith('/api/uploads/')) {
                const fileToDelete = blog.thumbnail.replace('/api/uploads/', '');
                const filePath = path.join(__dirname, '..', 'uploads', fileToDelete);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }

            await blogsCollection.deleteOne({ _id: new ObjectId(id) });

            res.json({
                success: true,
                message: 'ব্লগ সফলভাবে ডিলিট হয়েছে'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ব্লগ ডিলিট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ✅ TOGGLE blog active status
    router.patch('/:id/toggle', async (req, res) => {
        try {
            const { id } = req.params;
            const blog = await blogsCollection.findOne({ _id: new ObjectId(id) });

            if (!blog) {
                return res.status(404).json({
                    success: false,
                    message: 'ব্লগ পাওয়া যায়নি'
                });
            }

            const updatedStatus = !blog.isActive;
            await blogsCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { isActive: updatedStatus, updatedAt: new Date() } }
            );

            res.json({
                success: true,
                message: `ব্লগ ${updatedStatus ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে`,
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
