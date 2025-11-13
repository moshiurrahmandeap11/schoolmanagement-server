const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const upload = require('../../middleware/upload');

module.exports = (resultSheetCollection) => {
    
    // GET all result sheets
    router.get('/', async (req, res) => {
        try {
            const resultSheets = await resultSheetCollection.find().sort({ createdAt: -1 }).toArray();
            res.json({
                success: true,
                data: resultSheets
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ফলাফল শিট লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // CREATE new result sheet with file upload
    router.post('/', upload.single('resultSheet'), async (req, res) => {
        try {
            const {
                createdBy,
                modifiedBy,
                className,
                session,
                examTerm,
                status
            } = req.body;

            // Validation
            if (!createdBy) {
                return res.status(400).json({
                    success: false,
                    message: 'তৈরি করেছেন নির্বাচন করুন'
                });
            }

            if (!className) {
                return res.status(400).json({
                    success: false,
                    message: 'ক্লাস নির্বাচন করুন'
                });
            }

            if (!session) {
                return res.status(400).json({
                    success: false,
                    message: 'সেশন নির্বাচন করুন'
                });
            }

            if (!examTerm) {
                return res.status(400).json({
                    success: false,
                    message: 'পরীক্ষার টার্ম প্রয়োজন'
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'ফলাফল শিট ফাইল প্রয়োজন'
                });
            }

            const newResultSheet = {
                createdBy,
                modifiedBy: modifiedBy || createdBy,
                className,
                session,
                examTerm,
                resultSheet: `/api/uploads/${req.file.filename}`,
                resultSheetOriginalName: req.file.originalname,
                status: status || 'draft',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await resultSheetCollection.insertOne(newResultSheet);
            
            res.status(201).json({
                success: true,
                message: 'ফলাফল শিট সফলভাবে আপলোড হয়েছে',
                data: {
                    _id: result.insertedId,
                    ...newResultSheet
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ফলাফল শিট আপলোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // UPDATE result sheet
    router.put('/:id', upload.single('resultSheet'), async (req, res) => {
        try {
            const { id } = req.params;
            const {
                createdBy,
                modifiedBy,
                className,
                session,
                examTerm,
                status
            } = req.body;

            const resultSheet = await resultSheetCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!resultSheet) {
                return res.status(404).json({
                    success: false,
                    message: 'ফলাফল শিট পাওয়া যায়নি'
                });
            }

            const updateData = {
                createdBy,
                modifiedBy: modifiedBy || createdBy,
                className,
                session,
                examTerm,
                status: status || 'draft',
                updatedAt: new Date()
            };

            // Add new file if uploaded
            if (req.file) {
                updateData.resultSheet = `/api/uploads/${req.file.filename}`;
                updateData.resultSheetOriginalName = req.file.originalname;
                
                // Delete old file if exists
                if (resultSheet.resultSheet && resultSheet.resultSheet.startsWith('/api/uploads/')) {
                    const fs = require('fs');
                    const path = require('path');
                    const filename = resultSheet.resultSheet.replace('/api/uploads/', '');
                    const filePath = path.join(__dirname, '..', 'uploads', filename);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                }
            }

            const result = await resultSheetCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            res.json({
                success: true,
                message: 'ফলাফল শিট সফলভাবে আপডেট হয়েছে',
                data: {
                    _id: id,
                    ...updateData
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ফলাফল শিট আপডেট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // DELETE result sheet
    router.delete('/:id', async (req, res) => {
        try {
            const resultSheet = await resultSheetCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!resultSheet) {
                return res.status(404).json({
                    success: false,
                    message: 'ফলাফল শিট পাওয়া যায়নি'
                });
            }

            // Delete file if exists
            if (resultSheet.resultSheet && resultSheet.resultSheet.startsWith('/api/uploads/')) {
                const fs = require('fs');
                const path = require('path');
                const filename = resultSheet.resultSheet.replace('/api/uploads/', '');
                const filePath = path.join(__dirname, '..', 'uploads', filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }

            const result = await resultSheetCollection.deleteOne({ 
                _id: new ObjectId(req.params.id) 
            });

            res.json({
                success: true,
                message: 'ফলাফল শিট সফলভাবে ডিলিট হয়েছে'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ফলাফল শিট ডিলিট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // TOGGLE status
    router.patch('/:id/toggle-status', async (req, res) => {
        try {
            const resultSheet = await resultSheetCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!resultSheet) {
                return res.status(404).json({
                    success: false,
                    message: 'ফলাফল শিট পাওয়া যায়নি'
                });
            }

            const newStatus = resultSheet.status === 'published' ? 'draft' : 'published';

            const result = await resultSheetCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { 
                    $set: { 
                        status: newStatus,
                        updatedAt: new Date()
                    } 
                }
            );

            res.json({
                success: true,
                message: `ফলাফল শিট ${newStatus === 'published' ? 'প্রকাশিত' : 'খসড়া'} করা হয়েছে`,
                data: {
                    status: newStatus
                }
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