const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const upload = require('../../middleware/upload'); 

module.exports = (mainAdmissionInfoCollection) => {
    
    // GET all admission info
    router.get('/', async (req, res) => {
        try {
            const admissionInfo = await mainAdmissionInfoCollection.find({})
                .sort({ createdAt: -1 })
                .toArray();
                
            res.status(200).json({
                success: true,
                data: admissionInfo
            });
        } catch (error) {
            console.error('Error fetching admission info:', error);
            res.status(500).json({
                success: false,
                message: 'ভর্তি তথ্য লোড করতে সমস্যা হয়েছে'
            });
        }
    });

    // GET single admission info by ID
    router.get('/:id', async (req, res) => {
        try {
            const admissionInfo = await mainAdmissionInfoCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });
            
            if (!admissionInfo) {
                return res.status(404).json({
                    success: false,
                    message: 'ভর্তি তথ্য পাওয়া যায়নি'
                });
            }
            
            res.status(200).json({
                success: true,
                data: admissionInfo
            });
        } catch (error) {
            console.error('Error fetching admission info:', error);
            res.status(500).json({
                success: false,
                message: 'ভর্তি তথ্য লোড করতে সমস্যা হয়েছে'
            });
        }
    });

    // POST create new admission info
    router.post('/', upload.fields([
        { name: 'coverImage', maxCount: 1 },
        { name: 'attachment', maxCount: 1 }
    ]), async (req, res) => {
        try {
            const { 
                title, 
                classId, 
                className,
                startDate, 
                endDate, 
                description, 
                status 
            } = req.body;

            // Validation
            if (!title || !title.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'শিরোনাম প্রয়োজন'
                });
            }

            if (!classId || !className) {
                return res.status(400).json({
                    success: false,
                    message: 'ক্লাস নির্বাচন প্রয়োজন'
                });
            }

            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'শুরুর তারিখ এবং শেষ তারিখ প্রয়োজন'
                });
            }

            if (!description || !description.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'বিবরণ প্রয়োজন'
                });
            }

            // Date validation
            const start = new Date(startDate);
            const end = new Date(endDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (start < today) {
                return res.status(400).json({
                    success: false,
                    message: 'শুরুর তারিখ ভবিষ্যতের হতে হবে'
                });
            }

            if (end <= start) {
                return res.status(400).json({
                    success: false,
                    message: 'শেষ তারিখ শুরুর তারিখের পরে হতে হবে'
                });
            }

            const admissionData = {
                title: title.trim(),
                classId: classId.trim(),
                className: className.trim(),
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                description: description.trim(),
                status: status || 'draft',
                coverImage: req.files?.coverImage ? `/uploads/${req.files.coverImage[0].filename}` : null,
                attachment: req.files?.attachment ? `/uploads/${req.files.attachment[0].filename}` : null,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await mainAdmissionInfoCollection.insertOne(admissionData);

            res.status(201).json({
                success: true,
                message: 'ভর্তি তথ্য সফলভাবে তৈরি হয়েছে',
                data: {
                    _id: result.insertedId,
                    ...admissionData
                }
            });
        } catch (error) {
            console.error('Error creating admission info:', error);
            res.status(500).json({
                success: false,
                message: 'ভর্তি তথ্য তৈরি করতে সমস্যা হয়েছে'
            });
        }
    });

    // PUT update admission info
    router.put('/:id', upload.fields([
        { name: 'coverImage', maxCount: 1 },
        { name: 'attachment', maxCount: 1 }
    ]), async (req, res) => {
        try {
            const { 
                title, 
                classId, 
                className,
                startDate, 
                endDate, 
                description, 
                status 
            } = req.body;

            // Validation
            if (!title || !title.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'শিরোনাম প্রয়োজন'
                });
            }

            if (!classId || !className) {
                return res.status(400).json({
                    success: false,
                    message: 'ক্লাস নির্বাচন প্রয়োজন'
                });
            }

            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'শুরুর তারিখ এবং শেষ তারিখ প্রয়োজন'
                });
            }

            if (!description || !description.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'বিবরণ প্রয়োজন'
                });
            }

            // Date validation
            const start = new Date(startDate);
            const end = new Date(endDate);

            if (end <= start) {
                return res.status(400).json({
                    success: false,
                    message: 'শেষ তারিখ শুরুর তারিখের পরে হতে হবে'
                });
            }

            const updateData = {
                title: title.trim(),
                classId: classId.trim(),
                className: className.trim(),
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                description: description.trim(),
                status: status || 'draft',
                updatedAt: new Date()
            };

            // If new cover image uploaded, update it
            if (req.files?.coverImage) {
                updateData.coverImage = `/uploads/${req.files.coverImage[0].filename}`;
            }

            // If new attachment uploaded, update it
            if (req.files?.attachment) {
                updateData.attachment = `/uploads/${req.files.attachment[0].filename}`;
            }

            const result = await mainAdmissionInfoCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: updateData }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'ভর্তি তথ্য পাওয়া যায়নি'
                });
            }

            res.status(200).json({
                success: true,
                message: 'ভর্তি তথ্য সফলভাবে আপডেট হয়েছে'
            });
        } catch (error) {
            console.error('Error updating admission info:', error);
            res.status(500).json({
                success: false,
                message: 'ভর্তি তথ্য আপডেট করতে সমস্যা হয়েছে'
            });
        }
    });

    // DELETE admission info
    router.delete('/:id', async (req, res) => {
        try {
            const result = await mainAdmissionInfoCollection.deleteOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'ভর্তি তথ্য পাওয়া যায়নি'
                });
            }

            res.status(200).json({
                success: true,
                message: 'ভর্তি তথ্য সফলভাবে ডিলিট হয়েছে'
            });
        } catch (error) {
            console.error('Error deleting admission info:', error);
            res.status(500).json({
                success: false,
                message: 'ভর্তি তথ্য ডিলিট করতে সমস্যা হয়েছে'
            });
        }
    });

    // PATCH toggle status
    router.patch('/:id/toggle-status', async (req, res) => {
        try {
            const admissionInfo = await mainAdmissionInfoCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });
            
            if (!admissionInfo) {
                return res.status(404).json({
                    success: false,
                    message: 'ভর্তি তথ্য পাওয়া যায়নি'
                });
            }

            const newStatus = admissionInfo.status === 'published' ? 'draft' : 'published';
            
            await mainAdmissionInfoCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { 
                    $set: { 
                        status: newStatus,
                        updatedAt: new Date()
                    } 
                }
            );

            res.status(200).json({
                success: true,
                message: `ভর্তি তথ্য স্ট্যাটাস ${newStatus === 'published' ? 'প্রকাশিত' : 'খসড়া'} হয়েছে`,
                data: { status: newStatus }
            });
        } catch (error) {
            console.error('Error toggling admission info status:', error);
            res.status(500).json({
                success: false,
                message: 'স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে'
            });
        }
    });

    return router;
};