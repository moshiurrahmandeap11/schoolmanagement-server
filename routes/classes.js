const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (classesCollection, batchesCollection, sectionsCollection) => {

    // GET all classes
    router.get('/', async (req, res) => {
        try {
            const classes = await classesCollection.find().sort({ name: 1 }).toArray();
            res.json({
                success: true,
                data: classes
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ক্লাস লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // CREATE new class
    router.post('/', async (req, res) => {
        try {
            const { name } = req.body;
            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: 'ক্লাসের নাম আবশ্যক'
                });
            }

            const existingClass = await classesCollection.findOne({ name });
            if (existingClass) {
                return res.status(400).json({
                    success: false,
                    message: 'এই ক্লাস ইতিমধ্যে বিদ্যমান'
                });
            }

            const newClass = {
                name,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await classesCollection.insertOne(newClass);
            
            res.status(201).json({
                success: true,
                message: 'ক্লাস সফলভাবে তৈরি হয়েছে',
                data: {
                    _id: result.insertedId,
                    ...newClass
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ক্লাস তৈরি করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // BATCH ROUTES

    // GET batches by class name
    router.get('/batch', async (req, res) => {
        try {
            const { className } = req.query;
            
            if (!className) {
                return res.status(400).json({
                    success: false,
                    message: 'ক্লাস নাম প্রয়োজন'
                });
            }

            const batches = await batchesCollection.find({ 
                className: className 
            }).sort({ name: 1 }).toArray();

            res.json({
                success: true,
                data: batches
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ব্যাচ লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // CREATE new batch
    router.post('/batch', async (req, res) => {
        try {
            const { className, name } = req.body;

            if (!className || !name) {
                return res.status(400).json({
                    success: false,
                    message: 'ক্লাস নাম এবং ব্যাচ নাম আবশ্যক'
                });
            }

            const classExists = await classesCollection.findOne({ name: className });
            if (!classExists) {
                return res.status(404).json({
                    success: false,
                    message: 'ক্লাস পাওয়া যায়নি'
                });
            }

            const existingBatch = await batchesCollection.findOne({ 
                className: className, 
                name: name 
            });

            if (existingBatch) {
                return res.status(400).json({
                    success: false,
                    message: 'এই ক্লাসে ব্যাচ ইতিমধ্যে বিদ্যমান'
                });
            }

            const newBatch = {
                className,
                name,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await batchesCollection.insertOne(newBatch);
            
            res.status(201).json({
                success: true,
                message: 'ব্যাচ সফলভাবে তৈরি হয়েছে',
                data: {
                    _id: result.insertedId,
                    ...newBatch
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ব্যাচ তৈরি করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // SECTION ROUTES

    // ✅ FIX: এখানে পরিবর্তন করা হয়েছে
    router.get('/section', async (req, res) => {
        try {
            const { className, batch } = req.query; // ✅ 'batch' parameter নিচ্ছি
            
            if (!className || !batch) {
                return res.status(400).json({
                    success: false,
                    message: 'ক্লাস নাম এবং ব্যাচ নাম প্রয়োজন'
                });
            }

            // ✅ FIX: এখন 'batch' দিয়েই খুঁজবে (আগে 'batchName' ছিল)
            const sections = await sectionsCollection.find({ 
                className: className,
                batch: batch  // ✅ এটা পরিবর্তন করা হয়েছে
            }).sort({ name: 1 }).toArray();

            res.json({
                success: true,
                data: sections
            });
        } catch (error) {
            console.error('Section fetch error:', error);
            res.status(500).json({
                success: false,
                message: 'সেকশন লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // CREATE new section
    router.post('/section', async (req, res) => {
        try {
            const { className, batch, name } = req.body; // ✅ 'batch' নিচ্ছি

            if (!className || !batch || !name) {
                return res.status(400).json({
                    success: false,
                    message: 'ক্লাস নাম, ব্যাচ নাম এবং সেকশন নাম আবশ্যক'
                });
            }

            const classExists = await classesCollection.findOne({ name: className });
            if (!classExists) {
                return res.status(404).json({
                    success: false,
                    message: 'ক্লাস পাওয়া যায়নি'
                });
            }

            const batchExists = await batchesCollection.findOne({ 
                className: className, 
                name: batch  // ✅ 'batch' দিয়ে খুঁজছি
            });

            if (!batchExists) {
                return res.status(404).json({
                    success: false,
                    message: 'ব্যাচ পাওয়া যায়নি'
                });
            }

            const existingSection = await sectionsCollection.findOne({ 
                className: className, 
                batch: batch,  // ✅ 'batch' field
                name: name 
            });

            if (existingSection) {
                return res.status(400).json({
                    success: false,
                    message: 'এই ক্লাস এবং ব্যাচে সেকশন ইতিমধ্যে বিদ্যমান'
                });
            }

            const newSection = {
                className,
                batch,  // ✅ 'batch' field সংরক্ষণ করছি
                name,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await sectionsCollection.insertOne(newSection);
            
            res.status(201).json({
                success: true,
                message: 'সেকশন সফলভাবে তৈরি হয়েছে',
                data: {
                    _id: result.insertedId,
                    ...newSection
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'সেকশন তৈরি করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // GET all sections
    router.get('/section/all', async (req, res) => {
        try {
            const sections = await sectionsCollection.find().sort({ 
                className: 1, 
                batch: 1,  // ✅ 'batch' field
                name: 1 
            }).toArray();

            res.json({
                success: true,
                data: sections
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'সেকশন লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // DELETE batch
    router.delete('/batch/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ আইডি'
                });
            }

            const batch = await batchesCollection.findOne({ _id: new ObjectId(id) });
            if (batch) {
                const sectionsCount = await sectionsCollection.countDocuments({ 
                    className: batch.className, 
                    batch: batch.name  // ✅ 'batch' field
                });

                if (sectionsCount > 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'এই ব্যাচে সেকশন রয়েছে, প্রথমে সেকশন মুছুন'
                    });
                }
            }

            const result = await batchesCollection.deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'ব্যাচ পাওয়া যায়নি'
                });
            }

            res.json({
                success: true,
                message: 'ব্যাচ সফলভাবে মুছে ফেলা হয়েছে'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ব্যাচ মুছতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // DELETE section
    router.delete('/section/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ আইডি'
                });
            }

            const result = await sectionsCollection.deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'সেকশন পাওয়া যায়নি'
                });
            }

            res.json({
                success: true,
                message: 'সেকশন সফলভাবে মুছে ফেলা হয়েছে'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'সেকশন মুছতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    return router;
};