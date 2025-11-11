const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (discountCollection) => {

    // Get all discounts
    router.get('/', async (req, res) => {
        try {
            const discounts = await discountCollection.find({}).toArray();
            
            res.status(200).json({
                success: true,
                message: 'Discounts fetched successfully',
                data: discounts
            });
        } catch (error) {
            console.error('Error fetching discounts:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch discounts',
                error: error.message
            });
        }
    });

    // Create new discount
    router.post('/add-discount', async (req, res) => {
        try {
            const { 
                sessionId,
                sessionName,
                classId,
                className,
                batchId,
                batchName,
                feeTypeId,
                feeTypeName,
                discountTypeId,
                discountTypeName,
                discountAmount,
                discountPercentage,
                description
            } = req.body;

            // Validation
            if (!sessionId) {
                return res.status(400).json({
                    success: false,
                    message: 'সেশন নির্বাচন করুন'
                });
            }

            if (!classId) {
                return res.status(400).json({
                    success: false,
                    message: 'ক্লাস নির্বাচন করুন'
                });
            }

            if (!feeTypeId) {
                return res.status(400).json({
                    success: false,
                    message: 'ফি টাইপ নির্বাচন করুন'
                });
            }

            if (!discountTypeId) {
                return res.status(400).json({
                    success: false,
                    message: 'ছাড়ের টাইপ নির্বাচন করুন'
                });
            }

            // Check if discount already exists for this combination
            const existingDiscount = await discountCollection.findOne({ 
                sessionId: sessionId,
                classId: classId,
                batchId: batchId,
                feeTypeId: feeTypeId,
                discountTypeId: discountTypeId
            });

            if (existingDiscount) {
                return res.status(400).json({
                    success: false,
                    message: 'এই কম্বিনেশনের জন্য ইতিমধ্যে ছাড় বরাদ্দ করা হয়েছে'
                });
            }

            const newDiscount = {
                sessionId: sessionId,
                sessionName: sessionName || '',
                classId: classId,
                className: className || '',
                batchId: batchId || null,
                batchName: batchName || '',
                feeTypeId: feeTypeId,
                feeTypeName: feeTypeName || '',
                discountTypeId: discountTypeId,
                discountTypeName: discountTypeName || '',
                discountAmount: discountAmount ? parseFloat(discountAmount) : 0,
                discountPercentage: discountPercentage ? parseFloat(discountPercentage) : 0,
                description: description || '',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await discountCollection.insertOne(newDiscount);

            res.status(201).json({
                success: true,
                message: 'ছাড় সফলভাবে বরাদ্দ হয়েছে',
                data: {
                    _id: result.insertedId,
                    ...newDiscount
                }
            });
        } catch (error) {
            console.error('Error creating discount:', error);
            res.status(500).json({
                success: false,
                message: 'ছাড় বরাদ্দ করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // Update discount
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { 
                sessionId,
                sessionName,
                classId,
                className,
                batchId,
                batchName,
                feeTypeId,
                feeTypeName,
                discountTypeId,
                discountTypeName,
                discountAmount,
                discountPercentage,
                description
            } = req.body;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid discount ID'
                });
            }

            // Validation
            if (!sessionId) {
                return res.status(400).json({
                    success: false,
                    message: 'সেশন নির্বাচন করুন'
                });
            }

            if (!classId) {
                return res.status(400).json({
                    success: false,
                    message: 'ক্লাস নির্বাচন করুন'
                });
            }

            if (!feeTypeId) {
                return res.status(400).json({
                    success: false,
                    message: 'ফি টাইপ নির্বাচন করুন'
                });
            }

            if (!discountTypeId) {
                return res.status(400).json({
                    success: false,
                    message: 'ছাড়ের টাইপ নির্বাচন করুন'
                });
            }

            // Check if discount exists
            const existingDiscount = await discountCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingDiscount) {
                return res.status(404).json({
                    success: false,
                    message: 'ছাড় পাওয়া যায়নি'
                });
            }

            // Check if discount already exists for this combination (excluding current one)
            const duplicateDiscount = await discountCollection.findOne({
                sessionId: sessionId,
                classId: classId,
                batchId: batchId,
                feeTypeId: feeTypeId,
                discountTypeId: discountTypeId,
                _id: { $ne: new ObjectId(id) }
            });

            if (duplicateDiscount) {
                return res.status(400).json({
                    success: false,
                    message: 'এই কম্বিনেশনের জন্য ইতিমধ্যে ছাড় বরাদ্দ করা হয়েছে'
                });
            }

            const updatedDiscount = {
                sessionId: sessionId,
                sessionName: sessionName || '',
                classId: classId,
                className: className || '',
                batchId: batchId || null,
                batchName: batchName || '',
                feeTypeId: feeTypeId,
                feeTypeName: feeTypeName || '',
                discountTypeId: discountTypeId,
                discountTypeName: discountTypeName || '',
                discountAmount: discountAmount ? parseFloat(discountAmount) : 0,
                discountPercentage: discountPercentage ? parseFloat(discountPercentage) : 0,
                description: description || '',
                updatedAt: new Date()
            };

            const result = await discountCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedDiscount }
            );

            if (result.modifiedCount === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'ছাড়ে কোন পরিবর্তন করা হয়নি'
                });
            }

            res.status(200).json({
                success: true,
                message: 'ছাড় সফলভাবে আপডেট হয়েছে',
                data: {
                    _id: id,
                    ...updatedDiscount,
                    isActive: existingDiscount.isActive,
                    createdAt: existingDiscount.createdAt
                }
            });
        } catch (error) {
            console.error('Error updating discount:', error);
            res.status(500).json({
                success: false,
                message: 'ছাড় আপডেট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // Delete discount
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid discount ID'
                });
            }

            // Check if discount exists
            const existingDiscount = await discountCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingDiscount) {
                return res.status(404).json({
                    success: false,
                    message: 'ছাড় পাওয়া যায়নি'
                });
            }

            const result = await discountCollection.deleteOne({ 
                _id: new ObjectId(id) 
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'ছাড় পাওয়া যায়নি'
                });
            }

            res.status(200).json({
                success: true,
                message: 'ছাড় সফলভাবে ডিলিট হয়েছে'
            });
        } catch (error) {
            console.error('Error deleting discount:', error);
            res.status(500).json({
                success: false,
                message: 'ছাড় ডিলিট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // Toggle discount status
    router.patch('/:id/toggle-status', async (req, res) => {
        try {
            const { id } = req.params;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid discount ID'
                });
            }

            // Check if discount exists
            const existingDiscount = await discountCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingDiscount) {
                return res.status(404).json({
                    success: false,
                    message: 'ছাড় পাওয়া যায়নি'
                });
            }

            const newStatus = !existingDiscount.isActive;

            const result = await discountCollection.updateOne(
                { _id: new ObjectId(id) },
                { 
                    $set: { 
                        isActive: newStatus,
                        updatedAt: new Date()
                    } 
                }
            );

            if (result.modifiedCount === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে'
                });
            }

            res.status(200).json({
                success: true,
                message: `ছাড় ${newStatus ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে`,
                data: {
                    isActive: newStatus
                }
            });
        } catch (error) {
            console.error('Error toggling discount status:', error);
            res.status(500).json({
                success: false,
                message: 'স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    return router;
};