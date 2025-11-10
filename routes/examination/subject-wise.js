const express = require('express');
const router = express.Router();

module.exports = (subjectWiseCollection) => {
    
    // Get filter options for dropdowns
    router.get('/filters', async (req, res) => {
        try {
            // Static options - আপনি চাইলে ডেটাবেস থেকে fetch করতে পারেন
            const examCategories = ['মিড টার্ম', 'ফাইনাল', 'সেমিস্টার', 'কুইজ'];
            const subjects = ['গণিত', 'ইংরেজি', 'বিজ্ঞান', 'বাংলা', 'সমাজ বিজ্ঞান', 'ধর্ম'];
            
            res.json({
                success: true,
                examCategories,
                subjects
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching filter options',
                error: error.message
            });
        }
    });

    // Handle form submission
    router.post('/', async (req, res) => {
        try {
            const { examCategory, order, totalAbsent, totalPresent, subject } = req.body;
            
            // Validation
            if (!examCategory || !subject) {
                return res.status(400).json({
                    success: false,
                    message: 'Exam category and subject are required'
                });
            }
            
            const newSubjectMark = {
                examCategory,
                order: order || 0,
                totalAbsent: totalAbsent || 0,
                totalPresent: totalPresent || 0,
                subject,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            // Save to database
            const result = await subjectWiseCollection.insertOne(newSubjectMark);
            
            res.json({
                success: true,
                message: 'Subject marks added successfully',
                data: {
                    id: result.insertedId,
                    ...newSubjectMark
                }
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error adding subject marks',
                error: error.message
            });
        }
    });

    return router;
};