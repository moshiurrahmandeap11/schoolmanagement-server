const express = require('express');
const { ObjectId } = require('mongodb');
const upload = require('../../middleware/upload'); // already ready ache
const router = express.Router();

module.exports = (instituteServicesCollection) => {

    // ✅ সব সুবিধা পাওয়া
    router.get('/', async (req, res) => {
        try {
            const services = await instituteServicesCollection.find().toArray();
            res.send({ success: true, data: services });
        } catch (err) {
            res.status(500).send({ success: false, message: err.message });
        }
    });

    // ✅ নতুন সুবিধা যোগ করা (image সহ)
    router.post('/', upload.single('image'), async (req, res) => {
        try {
            const { name, description } = req.body;

            if (!name || !description) {
                return res.status(400).send({ success: false, message: 'সব তথ্য দিন' });
            }

            const newData = {
                name,
                description,
                image: req.file ? `/api/uploads/${req.file.filename}` : null,
                createdAt: new Date(),
            };

            const result = await instituteServicesCollection.insertOne(newData);
            res.send({ success: true, data: result });
        } catch (err) {
            res.status(500).send({ success: false, message: err.message });
        }
    });

    // ✅ সুবিধা আপডেট করা (image সহ optional)
    router.put('/:id', upload.single('image'), async (req, res) => {
        try {
            const id = req.params.id;
            const { name, description } = req.body;
            const updateData = {
                name,
                description,
            };
            if (req.file) {
                updateData.image = `/api/uploads/${req.file.filename}`;
            }

            const result = await instituteServicesCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );
            res.send({ success: true, data: result });
        } catch (err) {
            res.status(500).send({ success: false, message: err.message });
        }
    });

    // ✅ সুবিধা ডিলিট করা
    router.delete('/:id', async (req, res) => {
        try {
            const id = req.params.id;
            const result = await instituteServicesCollection.deleteOne({ _id: new ObjectId(id) });
            res.send({ success: true, data: result });
        } catch (err) {
            res.status(500).send({ success: false, message: err.message });
        }
    });

    return router;
};
