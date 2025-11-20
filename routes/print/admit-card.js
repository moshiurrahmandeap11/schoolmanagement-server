const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (admitCardCollection) => {

// Generate admit card
    router.post('/', async (req, res) => {
        try {
            const {
                classId,
                batchId,
                sectionId,
                sessionId,
                monthlyFee,
                sendAttendanceSms,
                examId,
                students, // Front-end থেকে students ডেটা
                examData // Front-end থেকে exam ডেটা
            } = req.body;

            // Validation - students এবং examData এর validation সরিয়ে দিলাম
            if (!classId || !sessionId || !examId) {
                return res.status(400).json({
                    success: false,
                    message: 'ক্লাস, সেশন এবং পরীক্ষা বাধ্যতামূলক'
                });
            }

            // Validate ObjectId
            if (!ObjectId.isValid(classId) || 
                !ObjectId.isValid(sessionId) || 
                !ObjectId.isValid(examId)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ আইডি ফরম্যাট'
                });
            }

            // যদি students array না থাকে, তাহলে শুধু template তৈরি করব
            if (!students || !Array.isArray(students) || students.length === 0) {
                // শুধু metadata save করব
                const admitCardTemplate = {
                    classId: new ObjectId(classId),
                    batchId: batchId && ObjectId.isValid(batchId) ? new ObjectId(batchId) : null,
                    sectionId: sectionId && ObjectId.isValid(sectionId) ? new ObjectId(sectionId) : null,
                    sessionId: new ObjectId(sessionId),
                    examId: new ObjectId(examId),
                    examName: examData?.name || 'Unknown Exam',
                    examType: examData?.type || 'Regular',
                    monthlyFee: monthlyFee ? parseFloat(monthlyFee) : 0,
                    admitCardNumber: `TEMP${Date.now()}`,
                    generatedAt: new Date(),
                    status: 'template',
                    sendAttendanceSms: !!sendAttendanceSms,
                    printed: false,
                    printedAt: null,
                    isTemplate: true
                };

                const result = await admitCardCollection.insertOne(admitCardTemplate);

                return res.json({
                    success: true,
                    message: 'এডমিট কার্ড টেমপ্লেট তৈরি হয়েছে। পরে শিক্ষার্থী যোগ করুন।',
                    data: {
                        generatedCount: 1,
                        admitCardNumber: admitCardTemplate.admitCardNumber,
                        isTemplate: true
                    }
                });
            }

            // যদি students array থাকে তাহলে admit cards generate করব
            const admitCards = students.map(student => {
                const admitCardNumber = `ADM${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
                
                return {
                    studentId: new ObjectId(student._id),
                    studentName: student.name,
                    studentRoll: student.rollNumber,
                    fatherName: student.fatherName || '',
                    motherName: student.motherName || '',
                    classId: new ObjectId(classId),
                    batchId: batchId && ObjectId.isValid(batchId) ? new ObjectId(batchId) : null,
                    sectionId: sectionId && ObjectId.isValid(sectionId) ? new ObjectId(sectionId) : null,
                    sessionId: new ObjectId(sessionId),
                    examId: new ObjectId(examId),
                    examName: examData?.name || 'Unknown Exam',
                    examType: examData?.type || 'Regular',
                    monthlyFee: monthlyFee ? parseFloat(monthlyFee) : 0,
                    admitCardNumber,
                    generatedAt: new Date(),
                    status: 'active',
                    sendAttendanceSms: !!sendAttendanceSms,
                    printed: false,
                    printedAt: null
                };
            });

            // Insert admit cards
            const result = await admitCardCollection.insertMany(admitCards);

            // Send SMS if enabled
            if (sendAttendanceSms) {
                await sendAdmitCardSMS(admitCards);
            }

            res.json({
                success: true,
                message: `${admitCards.length}টি এডমিট কার্ড সফলভাবে তৈরি হয়েছে`,
                data: {
                    generatedCount: result.insertedCount,
                    admitCards: admitCards.map(card => ({
                        studentName: card.studentName,
                        admitCardNumber: card.admitCardNumber,
                        examName: card.examName
                    }))
                }
            });

        } catch (error) {
            console.error('Error generating admit card:', error);
            res.status(500).json({
                success: false,
                message: 'এডমিট কার্ড তৈরি করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // Get all admit cards with filters
    router.get('/', async (req, res) => {
        try {
            const { 
                classId, 
                sessionId, 
                examId, 
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

            if (examId && ObjectId.isValid(examId)) {
                filter.examId = new ObjectId(examId);
            }

            const skip = (parseInt(page) - 1) * parseInt(limit);
            
            const admitCards = await admitCardCollection
                .find(filter)
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ generatedAt: -1 })
                .toArray();

            const total = await admitCardCollection.countDocuments(filter);

            res.json({
                success: true,
                data: admitCards,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    totalItems: total,
                    itemsPerPage: parseInt(limit)
                }
            });

        } catch (error) {
            console.error('Error fetching admit cards:', error);
            res.status(500).json({
                success: false,
                message: 'এডমিট কার্ড লোড করতে সমস্যা হয়েছে'
            });
        }
    });

    // Get admit card by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ এডমিট কার্ড আইডি'
                });
            }

            const admitCard = await admitCardCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!admitCard) {
                return res.status(404).json({
                    success: false,
                    message: 'এডমিট কার্ড পাওয়া যায়নি'
                });
            }

            res.json({
                success: true,
                data: admitCard
            });

        } catch (error) {
            console.error('Error fetching admit card:', error);
            res.status(500).json({
                success: false,
                message: 'এডমিট কার্ড লোড করতে সমস্যা হয়েছে'
            });
        }
    });

    // Update admit card status
    router.patch('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ এডমিট কার্ড আইডি'
                });
            }

            const result = await admitCardCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { ...updateData, updatedAt: new Date() } }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'এডমিট কার্ড পাওয়া যায়নি'
                });
            }

            res.json({
                success: true,
                message: 'এডমিট কার্ড সফলভাবে আপডেট হয়েছে'
            });

        } catch (error) {
            console.error('Error updating admit card:', error);
            res.status(500).json({
                success: false,
                message: 'এডমিট কার্ড আপডেট করতে সমস্যা হয়েছে'
            });
        }
    });

    // Delete admit card
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ এডমিট কার্ড আইডি'
                });
            }

            const result = await admitCardCollection.deleteOne({ 
                _id: new ObjectId(id) 
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'এডমিট কার্ড পাওয়া যায়নি'
                });
            }

            res.json({
                success: true,
                message: 'এডমিট কার্ড সফলভাবে ডিলিট হয়েছে'
            });

        } catch (error) {
            console.error('Error deleting admit card:', error);
            res.status(500).json({
                success: false,
                message: 'এডমিট কার্ড ডিলিট করতে সমস্যা হয়েছে'
            });
        }
    });

    // Helper function to send SMS
    async function sendAdmitCardSMS(admitCards) {
        try {
            // Implement your SMS gateway integration here
            for (const card of admitCards) {
                const message = `প্রিয় ${card.studentName}, আপনার ${card.examName} পরীক্ষার এডমিট কার্ড তৈরি হয়েছে। এডমিট কার্ড নং: ${card.admitCardNumber}`;
                
                // Example SMS integration (replace with your actual SMS service)
                // await smsService.send(card.studentPhone, message);
                console.log(`SMS sent for admit card: ${card.admitCardNumber}`);
            }
        } catch (error) {
            console.error('Error sending SMS:', error);
            // Don't throw error to prevent admit card generation from failing
        }
    }

    return router;
};