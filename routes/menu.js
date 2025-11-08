const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (menuCollection) => {
    
    // ✅ GET all menus
    router.get('/', async (req, res) => {
        try {
            const menus = await menuCollection.find().sort({ createdAt: -1 }).toArray();
            res.json({
                success: true,
                data: menus
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'মেনু লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ✅ CREATE new menu (Only name)
    router.post('/', async (req, res) => {
        try {
            const { name } = req.body;

            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: 'মেনু নাম আবশ্যক'
                });
            }

            // Check if menu name already exists
            const existingMenu = await menuCollection.findOne({ 
                name: { $regex: new RegExp(`^${name}$`, 'i') } 
            });

            if (existingMenu) {
                return res.status(400).json({
                    success: false,
                    message: 'এই নামের মেনু ইতিমধ্যে存在'
                });
            }

            const newMenu = {
                name: name.trim(),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await menuCollection.insertOne(newMenu);

            res.status(201).json({
                success: true,
                message: 'মেনু সফলভাবে তৈরি হয়েছে',
                data: {
                    _id: result.insertedId,
                    ...newMenu
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'মেনু তৈরি করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ✅ UPDATE menu (Only name)
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { name } = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ মেনু আইডি'
                });
            }

            const existingMenu = await menuCollection.findOne({ _id: new ObjectId(id) });
            if (!existingMenu) {
                return res.status(404).json({
                    success: false,
                    message: 'মেনু পাওয়া যায়নি'
                });
            }

            // Check if menu name already exists (excluding current menu)
            if (name && name !== existingMenu.name) {
                const duplicateMenu = await menuCollection.findOne({ 
                    name: { $regex: new RegExp(`^${name}$`, 'i') },
                    _id: { $ne: new ObjectId(id) }
                });

                if (duplicateMenu) {
                    return res.status(400).json({
                        success: false,
                        message: 'এই নামের মেনু ইতিমধ্যে存在'
                    });
                }
            }

            const updatedData = {
                name: name || existingMenu.name,
                updatedAt: new Date()
            };

            await menuCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedData }
            );

            res.json({
                success: true,
                message: 'মেনু সফলভাবে আপডেট হয়েছে',
                data: updatedData
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'মেনু আপডেট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ✅ DELETE menu
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ মেনু আইডি'
                });
            }

            const menu = await menuCollection.findOne({ _id: new ObjectId(id) });

            if (!menu) {
                return res.status(404).json({
                    success: false,
                    message: 'মেনু পাওয়া যায়নি'
                });
            }

            await menuCollection.deleteOne({ _id: new ObjectId(id) });

            res.json({
                success: true,
                message: 'মেনু সফলভাবে ডিলিট হয়েছে'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'মেনু ডিলিট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    return router;
};