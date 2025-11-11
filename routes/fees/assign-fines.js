const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (assignFinesCollection) => {

    // Get all assigned fines
    router.get('/', async (req, res) => {
        try {
            const fines = await assignFinesCollection.find({}).toArray();
            
            res.status(200).json({
                success: true,
                message: 'Assigned fines fetched successfully',
                data: fines
            });
        } catch (error) {
            console.error('Error fetching assigned fines:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch assigned fines',
                error: error.message
            });
        }
    });

    // Create new fine assignment
    router.post('/assign-fine', async (req, res) => {
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
                fineTypeId,
                fineTypeName,
                fineAmount,
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

            if (!fineTypeId) {
                return res.status(400).json({
                    success: false,
                    message: 'জরিমানার টাইপ নির্বাচন করুন'
                });
            }

            if (!fineAmount || fineAmount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'বৈধ জরিমানার পরিমাণ লিখুন'
                });
            }

            // Check if fine already exists for this combination
            const existingFine = await assignFinesCollection.findOne({ 
                sessionId: sessionId,
                classId: classId,
                batchId: batchId,
                feeTypeId: feeTypeId,
                fineTypeId: fineTypeId
            });

            if (existingFine) {
                return res.status(400).json({
                    success: false,
                    message: 'এই কম্বিনেশনের জন্য ইতিমধ্যে জরিমানা বরাদ্দ করা হয়েছে'
                });
            }

            const newFine = {
                sessionId: sessionId,
                sessionName: sessionName || '',
                classId: classId,
                className: className || '',
                batchId: batchId || null,
                batchName: batchName || '',
                feeTypeId: feeTypeId,
                feeTypeName: feeTypeName || '',
                fineTypeId: fineTypeId,
                fineTypeName: fineTypeName || '',
                fineAmount: parseFloat(fineAmount),
                description: description || '',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await assignFinesCollection.insertOne(newFine);

            res.status(201).json({
                success: true,
                message: 'জরিমানা সফলভাবে বরাদ্দ হয়েছে',
                data: {
                    _id: result.insertedId,
                    ...newFine
                }
            });
        } catch (error) {
            console.error('Error creating fine assignment:', error);
            res.status(500).json({
                success: false,
                message: 'জরিমানা বরাদ্দ করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // Update fine assignment
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
                fineTypeId,
                fineTypeName,
                fineAmount,
                description
            } = req.body;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid fine assignment ID'
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

            if (!fineTypeId) {
                return res.status(400).json({
                    success: false,
                    message: 'জরিমানার টাইপ নির্বাচন করুন'
                });
            }

            if (!fineAmount || fineAmount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'বৈধ জরিমানার পরিমাণ লিখুন'
                });
            }

            // Check if fine assignment exists
            const existingFine = await assignFinesCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingFine) {
                return res.status(404).json({
                    success: false,
                    message: 'জরিমানা বরাদ্দ পাওয়া যায়নি'
                });
            }

            // Check if fine already exists for this combination (excluding current one)
            const duplicateFine = await assignFinesCollection.findOne({
                sessionId: sessionId,
                classId: classId,
                batchId: batchId,
                feeTypeId: feeTypeId,
                fineTypeId: fineTypeId,
                _id: { $ne: new ObjectId(id) }
            });

            if (duplicateFine) {
                return res.status(400).json({
                    success: false,
                    message: 'এই কম্বিনেশনের জন্য ইতিমধ্যে জরিমানা বরাদ্দ করা হয়েছে'
                });
            }

            const updatedFine = {
                sessionId: sessionId,
                sessionName: sessionName || '',
                classId: classId,
                className: className || '',
                batchId: batchId || null,
                batchName: batchName || '',
                feeTypeId: feeTypeId,
                feeTypeName: feeTypeName || '',
                fineTypeId: fineTypeId,
                fineTypeName: fineTypeName || '',
                fineAmount: parseFloat(fineAmount),
                description: description || '',
                updatedAt: new Date()
            };

            const result = await assignFinesCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedFine }
            );

            if (result.modifiedCount === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'জরিমানায় কোন পরিবর্তন করা হয়নি'
                });
            }

            res.status(200).json({
                success: true,
                message: 'জরিমানা সফলভাবে আপডেট হয়েছে',
                data: {
                    _id: id,
                    ...updatedFine,
                    isActive: existingFine.isActive,
                    createdAt: existingFine.createdAt
                }
            });
        } catch (error) {
            console.error('Error updating fine assignment:', error);
            res.status(500).json({
                success: false,
                message: 'জরিমানা আপডেট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // Delete fine assignment
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid fine assignment ID'
                });
            }

            // Check if fine assignment exists
            const existingFine = await assignFinesCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingFine) {
                return res.status(404).json({
                    success: false,
                    message: 'জরিমানা বরাদ্দ পাওয়া যায়নি'
                });
            }

            const result = await assignFinesCollection.deleteOne({ 
                _id: new ObjectId(id) 
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'জরিমানা বরাদ্দ পাওয়া যায়নি'
                });
            }

            res.status(200).json({
                success: true,
                message: 'জরিমানা সফলভাবে ডিলিট হয়েছে'
            });
        } catch (error) {
            console.error('Error deleting fine assignment:', error);
            res.status(500).json({
                success: false,
                message: 'জরিমানা ডিলিট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // Toggle fine assignment status
    router.patch('/:id/toggle-status', async (req, res) => {
        try {
            const { id } = req.params;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid fine assignment ID'
                });
            }

            // Check if fine assignment exists
            const existingFine = await assignFinesCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingFine) {
                return res.status(404).json({
                    success: false,
                    message: 'জরিমানা বরাদ্দ পাওয়া যায়নি'
                });
            }

            const newStatus = !existingFine.isActive;

            const result = await assignFinesCollection.updateOne(
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
                message: `জরিমানা ${newStatus ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে`,
                data: {
                    isActive: newStatus
                }
            });
        } catch (error) {
            console.error('Error toggling fine assignment status:', error);
            res.status(500).json({
                success: false,
                message: 'স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    return router;
};