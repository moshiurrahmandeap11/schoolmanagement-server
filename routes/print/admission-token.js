const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (admissionTokenCollection) => {

    // Generate admission token
    router.post('/', async (req, res) => {
        try {
            const {
                classId,
                batchId,
                sectionId,
                sessionId,
                monthlyFee,
                sendAttendanceSms,
                tokenTemplateId
            } = req.body;

            // Validation
            if (!classId || !sessionId) {
                return res.status(400).json({
                    success: false,
                    message: 'ক্লাস এবং সেশন বাধ্যতামূলক'
                });
            }

            // Validate ObjectId
            if (!ObjectId.isValid(classId) || !ObjectId.isValid(sessionId)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ আইডি ফরম্যাট'
                });
            }

            // Generate admission token data
            const admissionTokenData = {
                classId: new ObjectId(classId),
                batchId: batchId && ObjectId.isValid(batchId) ? new ObjectId(batchId) : null,
                sectionId: sectionId && ObjectId.isValid(sectionId) ? new ObjectId(sectionId) : null,
                sessionId: new ObjectId(sessionId),
                monthlyFee: monthlyFee ? parseFloat(monthlyFee) : 0,
                sendAttendanceSms: !!sendAttendanceSms,
                tokenTemplateId: tokenTemplateId && ObjectId.isValid(tokenTemplateId) ? new ObjectId(tokenTemplateId) : null,
                tokenNumber: `AT${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
                generatedAt: new Date(),
                status: 'active',
                isUsed: false,
                usedAt: null,
                usedBy: null
            };

            // Insert admission token
            const result = await admissionTokenCollection.insertOne(admissionTokenData);

            // Send SMS if enabled
            if (sendAttendanceSms) {
                await sendAdmissionTokenSMS(admissionTokenData);
            }

            res.json({
                success: true,
                message: 'এডমিশন টোকেন সফলভাবে তৈরি হয়েছে',
                data: {
                    tokenId: result.insertedId,
                    tokenNumber: admissionTokenData.tokenNumber,
                    generatedAt: admissionTokenData.generatedAt
                }
            });

        } catch (error) {
            console.error('Error generating admission token:', error);
            res.status(500).json({
                success: false,
                message: 'এডমিশন টোকেন তৈরি করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // Get all admission tokens with filters
    router.get('/', async (req, res) => {
        try {
            const { 
                classId, 
                sessionId, 
                status,
                page = 1, 
                limit = 10 
            } = req.query;

            const filter = {};

            if (classId && ObjectId.isValid(classId)) {
                filter.classId = new ObjectId(classId);
            }

            if (sessionId && ObjectId.isValid(sessionId)) {
                filter.sessionId = new ObjectId(sessionId);
            }

            if (status) {
                filter.status = status;
            }

            const skip = (parseInt(page) - 1) * parseInt(limit);
            
            const admissionTokens = await admissionTokenCollection
                .find(filter)
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ generatedAt: -1 })
                .toArray();

            const total = await admissionTokenCollection.countDocuments(filter);

            res.json({
                success: true,
                data: admissionTokens,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    totalItems: total,
                    itemsPerPage: parseInt(limit)
                }
            });

        } catch (error) {
            console.error('Error fetching admission tokens:', error);
            res.status(500).json({
                success: false,
                message: 'এডমিশন টোকেন লোড করতে সমস্যা হয়েছে'
            });
        }
    });

    // Get admission token by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ এডমিশন টোকেন আইডি'
                });
            }

            const admissionToken = await admissionTokenCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!admissionToken) {
                return res.status(404).json({
                    success: false,
                    message: 'এডমিশন টোকেন পাওয়া যায়নি'
                });
            }

            res.json({
                success: true,
                data: admissionToken
            });

        } catch (error) {
            console.error('Error fetching admission token:', error);
            res.status(500).json({
                success: false,
                message: 'এডমিশন টোকেন লোড করতে সমস্যা হয়েছে'
            });
        }
    });

    // Get admission token by token number
    router.get('/number/:tokenNumber', async (req, res) => {
        try {
            const { tokenNumber } = req.params;

            const admissionToken = await admissionTokenCollection.findOne({ 
                tokenNumber: tokenNumber 
            });

            if (!admissionToken) {
                return res.status(404).json({
                    success: false,
                    message: 'এডমিশন টোকেন পাওয়া যায়নি'
                });
            }

            res.json({
                success: true,
                data: admissionToken
            });

        } catch (error) {
            console.error('Error fetching admission token by number:', error);
            res.status(500).json({
                success: false,
                message: 'এডমিশন টোকেন লোড করতে সমস্যা হয়েছে'
            });
        }
    });

    // Update admission token status
    router.patch('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ এডমিশন টোকেন আইডি'
                });
            }

            const result = await admissionTokenCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { ...updateData, updatedAt: new Date() } }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'এডমিশন টোকেন পাওয়া যায়নি'
                });
            }

            res.json({
                success: true,
                message: 'এডমিশন টোকেন সফলভাবে আপডেট হয়েছে'
            });

        } catch (error) {
            console.error('Error updating admission token:', error);
            res.status(500).json({
                success: false,
                message: 'এডমিশন টোকেন আপডেট করতে সমস্যা হয়েছে'
            });
        }
    });

    // Mark token as used
    router.patch('/:id/use', async (req, res) => {
        try {
            const { id } = req.params;
            const { usedBy } = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ এডমিশন টোকেন আইডি'
                });
            }

            const result = await admissionTokenCollection.updateOne(
                { _id: new ObjectId(id) },
                { 
                    $set: { 
                        isUsed: true,
                        usedAt: new Date(),
                        usedBy: usedBy,
                        status: 'used',
                        updatedAt: new Date()
                    } 
                }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'এডমিশন টোকেন পাওয়া যায়নি'
                });
            }

            res.json({
                success: true,
                message: 'এডমিশন টোকেন ব্যবহৃত হিসেবে চিহ্নিত হয়েছে'
            });

        } catch (error) {
            console.error('Error marking token as used:', error);
            res.status(500).json({
                success: false,
                message: 'এডমিশন টোকেন আপডেট করতে সমস্যা হয়েছে'
            });
        }
    });

    // Delete admission token
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ এডমিশন টোকেন আইডি'
                });
            }

            const result = await admissionTokenCollection.deleteOne({ 
                _id: new ObjectId(id) 
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'এডমিশন টোকেন পাওয়া যায়নি'
                });
            }

            res.json({
                success: true,
                message: 'এডমিশন টোকেন সফলভাবে ডিলিট হয়েছে'
            });

        } catch (error) {
            console.error('Error deleting admission token:', error);
            res.status(500).json({
                success: false,
                message: 'এডমিশন টোকেন ডিলিট করতে সমস্যা হয়েছে'
            });
        }
    });

    // Helper function to send SMS
    async function sendAdmissionTokenSMS(tokenData) {
        try {
            // Implement your SMS gateway integration here
            const message = `আপনার এডমিশন টোকেন তৈরি হয়েছে। টোকেন নং: ${tokenData.tokenNumber}`;
            
            // Example SMS integration (replace with your actual SMS service)
            // await smsService.send(phoneNumber, message);
            console.log(`SMS sent for admission token: ${tokenData.tokenNumber}`);
            
        } catch (error) {
            console.error('Error sending SMS:', error);
            // Don't throw error to prevent token generation from failing
        }
    }

    return router;
};