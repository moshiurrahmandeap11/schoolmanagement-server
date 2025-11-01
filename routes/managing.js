const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

module.exports = (managingCollection) => {

    // ✅ GET all committee members
    router.get('/', async (req, res) => {
        try {
            const members = await managingCollection.find().sort({ createdAt: -1 }).toArray();
            res.json({
                success: true,
                data: members
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'কমিটি মেম্বার লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ✅ 🆕 GET single member by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ মেম্বার আইডি'
                });
            }

            const member = await managingCollection.findOne({ _id: new ObjectId(id) });

            if (!member) {
                return res.status(404).json({
                    success: false,
                    message: 'মেম্বার পাওয়া যায়নি'
                });
            }

            res.json({
                success: true,
                data: member
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'মেম্বার ডেটা আনতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { name, position, social } = req.body;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'ইমেজ আপলোড করা বাধ্যতামূলক'
            });
        }

        // 🧠 Ensure managing-committee folder exists
        const folderPath = path.join(__dirname, '..', 'uploads', 'managing-committee');
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        // 🧩 Move uploaded file into managing-committee folder
        const oldPath = path.join(__dirname, '..', 'uploads', req.file.filename);
        const newPath = path.join(folderPath, req.file.filename);
        fs.renameSync(oldPath, newPath);

        // ✅ Image URL
        const imageUrl = `/api/uploads/managing-committee/${req.file.filename}`;

        const newMember = {
            name,
            position,
            social: JSON.parse(social || '{}'),
            image: imageUrl,
            createdAt: new Date(),
        };

        const result = await managingCollection.insertOne(newMember);

        res.status(201).json({
            success: true,
            message: 'সদস্য সফলভাবে যুক্ত হয়েছে',
            data: { _id: result.insertedId, ...newMember }
        });
    } catch (error) {
        console.error('Error uploading member:', error);
        res.status(500).json({
            success: false,
            message: 'সদস্য যুক্ত করতে সমস্যা হয়েছে',
            error: error.message
        });
    }
});


    // ✅ UPDATE member
    router.put('/:id', upload.single('image'), async (req, res) => {
        try {
            const { id } = req.params;
            const { name, designation, phone, isActive } = req.body;

            const existingMember = await managingCollection.findOne({ _id: new ObjectId(id) });
            if (!existingMember) {
                return res.status(404).json({
                    success: false,
                    message: 'মেম্বার পাওয়া যায়নি'
                });
            }

            // 🧠 Delete old image if new uploaded
            let updatedImage = existingMember.image;
            if (req.file) {
                if (existingMember.image && existingMember.image.startsWith('/api/uploads/')) {
                    const oldFile = existingMember.image.replace('/api/uploads/', '');
                    const oldPath = path.join(__dirname, '..', 'uploads', oldFile);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }
                updatedImage = `/api/uploads/managing-committee/${req.file.filename}`;
            }

            const updatedData = {
                name: name || existingMember.name,
                designation: designation || existingMember.designation,
                phone: phone || existingMember.phone,
                image: updatedImage,
                isActive: isActive !== undefined ? JSON.parse(isActive) : existingMember.isActive,
                updatedAt: new Date()
            };

            await managingCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedData }
            );

            res.json({
                success: true,
                message: 'মেম্বার সফলভাবে আপডেট হয়েছে'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'মেম্বার আপডেট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ✅ DELETE member
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const member = await managingCollection.findOne({ _id: new ObjectId(id) });

            if (!member) {
                return res.status(404).json({
                    success: false,
                    message: 'মেম্বার পাওয়া যায়নি'
                });
            }

            // Delete image from server
            if (member.image && member.image.startsWith('/api/uploads/')) {
                const fileToDelete = member.image.replace('/api/uploads/', '');
                const filePath = path.join(__dirname, '..', 'uploads', fileToDelete);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }

            await managingCollection.deleteOne({ _id: new ObjectId(id) });

            res.json({
                success: true,
                message: 'মেম্বার সফলভাবে ডিলিট হয়েছে'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'মেম্বার ডিলিট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ✅ TOGGLE active status
    router.patch('/:id/toggle', async (req, res) => {
        try {
            const { id } = req.params;
            const member = await managingCollection.findOne({ _id: new ObjectId(id) });

            if (!member) {
                return res.status(404).json({
                    success: false,
                    message: 'মেম্বার পাওয়া যায়নি'
                });
            }

            const updatedStatus = !member.isActive;
            await managingCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { isActive: updatedStatus, updatedAt: new Date() } }
            );

            res.json({
                success: true,
                message: `মেম্বার ${updatedStatus ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে`,
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
