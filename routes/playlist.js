const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (playlistCollection) => {
    
    // ✅ GET all playlists
    router.get('/', async (req, res) => {
        try {
            const playlists = await playlistCollection.find().sort({ createdAt: -1 }).toArray();
            res.json({
                success: true,
                data: playlists
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'প্লেলিস্ট লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ✅ GET single playlist by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ প্লেলিস্ট আইডি'
                });
            }

            const playlist = await playlistCollection.findOne({ _id: new ObjectId(id) });

            if (!playlist) {
                return res.status(404).json({
                    success: false,
                    message: 'প্লেলিস্ট পাওয়া যায়নি'
                });
            }

            res.json({
                success: true,
                data: playlist
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'প্লেলিস্ট ডেটা আনতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ✅ CREATE new playlist (Only name)
    router.post('/', async (req, res) => {
        try {
            const { name } = req.body;

            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: 'প্লেলিস্ট নাম আবশ্যক'
                });
            }

            // Check if playlist name already exists
            const existingPlaylist = await playlistCollection.findOne({ 
                name: { $regex: new RegExp(`^${name}$`, 'i') } 
            });

            if (existingPlaylist) {
                return res.status(400).json({
                    success: false,
                    message: 'এই নামের প্লেলিস্ট ইতিমধ্যে存在'
                });
            }

            const newPlaylist = {
                name: name.trim(),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await playlistCollection.insertOne(newPlaylist);

            res.status(201).json({
                success: true,
                message: 'প্লেলিস্ট সফলভাবে তৈরি হয়েছে',
                data: {
                    _id: result.insertedId,
                    ...newPlaylist
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'প্লেলিস্ট তৈরি করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ✅ UPDATE playlist (Only name)
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { name } = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ প্লেলিস্ট আইডি'
                });
            }

            const existingPlaylist = await playlistCollection.findOne({ _id: new ObjectId(id) });
            if (!existingPlaylist) {
                return res.status(404).json({
                    success: false,
                    message: 'প্লেলিস্ট পাওয়া যায়নি'
                });
            }

            // Check if playlist name already exists (excluding current playlist)
            if (name && name !== existingPlaylist.name) {
                const duplicatePlaylist = await playlistCollection.findOne({ 
                    name: { $regex: new RegExp(`^${name}$`, 'i') },
                    _id: { $ne: new ObjectId(id) }
                });

                if (duplicatePlaylist) {
                    return res.status(400).json({
                        success: false,
                        message: 'এই নামের প্লেলিস্ট ইতিমধ্যে存在'
                    });
                }
            }

            const updatedData = {
                name: name || existingPlaylist.name,
                updatedAt: new Date()
            };

            await playlistCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedData }
            );

            res.json({
                success: true,
                message: 'প্লেলিস্ট সফলভাবে আপডেট হয়েছে',
                data: updatedData
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'প্লেলিস্ট আপডেট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // ✅ DELETE playlist
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ প্লেলিস্ট আইডি'
                });
            }

            const playlist = await playlistCollection.findOne({ _id: new ObjectId(id) });

            if (!playlist) {
                return res.status(404).json({
                    success: false,
                    message: 'প্লেলিস্ট পাওয়া যায়নি'
                });
            }

            await playlistCollection.deleteOne({ _id: new ObjectId(id) });

            res.json({
                success: true,
                message: 'প্লেলিস্ট সফলভাবে ডিলিট হয়েছে'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'প্লেলিস্ট ডিলিট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    return router;
};