const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

module.exports = (contactMainCollection) => {

    // ✅ সব কন্টাক্ট পাওয়া
    router.get('/', async (req, res) => {
        try {
            const contacts = await contactMainCollection.find().toArray();
            res.send({ success: true, data: contacts });
        } catch (err) {
            res.status(500).send({ success: false, message: err.message });
        }
    });

    // ✅ নতুন কন্টাক্ট যোগ করা
    router.post('/', async (req, res) => {
        try {
            const data = req.body;
            if (!data.name || !data.mobile || !data.email) {
                return res.status(400).send({ success: false, message: "Missing required fields" });
            }
            data.createdAt = new Date();
            const result = await contactMainCollection.insertOne(data);
            res.send({ success: true, data: result });
        } catch (err) {
            res.status(500).send({ success: false, message: err.message });
        }
    });

    // ✅ কন্টাক্ট আপডেট করা
    router.put('/:id', async (req, res) => {
        try {
            const id = req.params.id;
            const updatedData = req.body;
            const result = await contactMainCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedData }
            );
            res.send({ success: true, data: result });
        } catch (err) {
            res.status(500).send({ success: false, message: err.message });
        }
    });

    // ✅ কন্টাক্ট ডিলিট করা
    router.delete('/:id', async (req, res) => {
        try {
            const id = req.params.id;
            const result = await contactMainCollection.deleteOne({ _id: new ObjectId(id) });
            res.send({ success: true, data: result });
        } catch (err) {
            res.status(500).send({ success: false, message: err.message });
        }
    });

    return router;
};
