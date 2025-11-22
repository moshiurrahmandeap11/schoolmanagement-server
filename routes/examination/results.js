const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (resultsCollection) => {

    // GET all results with search and filters
    router.get('/', async (req, res) => {
        try {
            const { studentId, studentName, examCategoryId } = req.query;
            
            let filter = {};
            
            if (studentId) {
                filter.studentId = { $regex: studentId, $options: 'i' };
            }
            
            if (studentName) {
                filter.studentName = { $regex: studentName, $options: 'i' };
            }
            
            if (examCategoryId && examCategoryId !== 'all') {
                filter.examCategoryId = new ObjectId(examCategoryId);
            }

            const results = await resultsCollection.aggregate([
                {
                    $match: filter
                },
                {
                    $lookup: {
                        from: 'exam-categories',
                        localField: 'examCategoryId',
                        foreignField: '_id',
                        as: 'examCategory'
                    }
                },
                {
                    $lookup: {
                        from: 'students',
                        localField: 'studentId',
                        foreignField: 'studentId',
                        as: 'student'
                    }
                },
                {
                    $sort: { createdAt: -1 }
                }
            ]).toArray();
            
            // Format the response
            const formattedResults = results.map(result => ({
                _id: result._id,
                studentId: result.studentId,
                studentName: result.studentName,
                examCategoryName: result.examCategoryName || result.examCategory[0]?.name || 'N/A',
                averageMarks: result.averageMarks,
                averageLetterGrade: result.averageLetterGrade,
                order: result.order,
                totalAbsent: result.totalAbsent,
                totalPresent: result.totalPresent,
                marksheet: result.marksheet,
                createdAt: result.createdAt
            }));

            res.json({
                success: true,
                data: formattedResults,
                message: 'Results fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching results:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching results',
                error: error.message
            });
        }
    });

    // GET single result by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid result ID'
                });
            }

            const results = await resultsCollection.aggregate([
                {
                    $match: { _id: new ObjectId(id) }
                },
                {
                    $lookup: {
                        from: 'exam-categories',
                        localField: 'examCategoryId',
                        foreignField: '_id',
                        as: 'examCategory'
                    }
                },
                {
                    $lookup: {
                        from: 'students',
                        localField: 'studentId',
                        foreignField: 'studentId',
                        as: 'student'
                    }
                }
            ]).toArray();

            if (results.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Result not found'
                });
            }

            const result = results[0];
            const formattedResult = {
                _id: result._id,
                examCategoryId: result.examCategoryId,
                examCategoryName: result.examCategoryName || result.examCategory[0]?.name || 'N/A',
                studentId: result.studentId,
                studentName: result.studentName,
                averageMarks: result.averageMarks,
                averageLetterGrade: result.averageLetterGrade,
                order: result.order,
                totalAbsent: result.totalAbsent,
                totalPresent: result.totalPresent,
                marksheet: result.marksheet,
                createdAt: result.createdAt
            };

            res.json({
                success: true,
                data: formattedResult,
                message: 'Result fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching result:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching result',
                error: error.message
            });
        }
    });

// CREATE new result
router.post('/', async (req, res) => {
    try {
        const {
            examCategoryId,
            examCategoryName,     // এটাও নিচ্ছি
            studentId,
            studentName,
            averageMarks,
            averageLetterGrade,
            order,
            totalAbsent,
            totalPresent,
            marksheet
        } = req.body;

        // Validation
        if (!examCategoryId || !studentId || !averageMarks || !averageLetterGrade) {
            return res.status(400).json({
                success: false,
                message: 'পরীক্ষা, শিক্ষার্থী, গড় মার্কস ও গ্রেড আবশ্যক'
            });
        }

        // ObjectId validation + conversion
        if (!ObjectId.isValid(examCategoryId)) {
            return res.status(400).json({
                success: false,
                message: 'অবৈধ পরীক্ষা আইডি'
            });
        }

        // Duplicate check
        const existing = await resultsCollection.findOne({
            studentId,
            examCategoryId: new ObjectId(examCategoryId)
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'এই শিক্ষার্থীর জন্য এই পরীক্ষার ফলাফল ইতিমধ্যে আছে'
            });
        }

        const newResult = {
            examCategoryId: new ObjectId(examCategoryId),
            examCategoryName: examCategoryName || 'Unknown Exam', // এটা এখন সেভ হবে
            studentId,
            studentName: studentName || 'Unknown Student',
            averageMarks: parseFloat(averageMarks),
            averageLetterGrade,
            order: parseInt(order) || null,
            totalAbsent: parseInt(totalAbsent) || 0,
            totalPresent: parseInt(totalPresent) || 0,
            marksheet: marksheet || null,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await resultsCollection.insertOne(newResult);

        res.status(201).json({
            success: true,
            message: 'ফলাফল সফলভাবে তৈরি হয়েছে',
            data: { _id: result.insertedId, ...newResult }
        });

    } catch (error) {
        console.error('Error creating result:', error);
        res.status(500).json({
            success: false,
            message: 'ফলাফল তৈরি করতে সমস্যা হয়েছে',
            error: error.message
        });
    }
});

// UPDATE result
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'অবৈধ আইডি' });
        }

        const {
            examCategoryId,
            examCategoryName,
            studentId,
            studentName,
            averageMarks,
            averageLetterGrade,
            order,
            totalAbsent,
            totalPresent,
            marksheet
        } = req.body;

        if (!examCategoryId || !studentId || !averageMarks || !averageLetterGrade) {
            return res.status(400).json({ success: false, message: 'সকল আবশ্যকীয় তথ্য দিন' });
        }

        if (!ObjectId.isValid(examCategoryId)) {
            return res.status(400).json({ success: false, message: 'অবৈধ পরীক্ষা আইডি' });
        }

        // Duplicate check (excluding current)
        const existing = await resultsCollection.findOne({
            studentId,
            examCategoryId: new ObjectId(examCategoryId),
            _id: { $ne: new ObjectId(id) }
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'এই শিক্ষার্থীর জন্য এই পরীক্ষার ফলাফল ইতিমধ্যে আছে'
            });
        }

        const updateData = {
            examCategoryId: new ObjectId(examCategoryId),
            examCategoryName: examCategoryName || 'Unknown Exam',
            studentId,
            studentName: studentName || 'Unknown Student',
            averageMarks: parseFloat(averageMarks),
            averageLetterGrade,
            order: parseInt(order) || null,
            totalAbsent: parseInt(totalAbsent) || 0,
            totalPresent: parseInt(totalPresent) || 0,
            marksheet: marksheet || null,
            updatedAt: new Date()
        };

        const result = await resultsCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'ফলাফল পাওয়া যায়নি' });
        }

        res.json({
            success: true,
            message: 'ফলাফল সফলভাবে আপডেট হয়েছে',
            data: { _id: id, ...updateData }
        });

    } catch (error) {
        console.error('Error updating result:', error);
        res.status(500).json({
            success: false,
            message: 'আপডেট করতে সমস্যা হয়েছে'
        });
    }
});

    // DELETE result
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid result ID'
                });
            }

            const result = await resultsCollection.deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Result not found'
                });
            }

            res.json({
                success: true,
                message: 'Result deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting result:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting result',
                error: error.message
            });
        }
    });

    // GET student results by student ID or name
    router.get('/student/search', async (req, res) => {
        try {
            const { studentId, studentName } = req.query;
            
            if (!studentId && !studentName) {
                return res.status(400).json({
                    success: false,
                    message: 'Student ID or Name is required'
                });
            }

            let filter = {};
            
            if (studentId) {
                filter.studentId = { $regex: studentId, $options: 'i' };
            }
            
            if (studentName) {
                filter.studentName = { $regex: studentName, $options: 'i' };
            }

            const results = await resultsCollection.aggregate([
                {
                    $match: filter
                },
                {
                    $lookup: {
                        from: 'exam-categories',
                        localField: 'examCategoryId',
                        foreignField: '_id',
                        as: 'examCategory'
                    }
                },
                {
                    $sort: { createdAt: -1 }
                }
            ]).toArray();

            res.json({
                success: true,
                data: results,
                message: 'Student results fetched successfully'
            });
        } catch (error) {
            console.error('Error searching student results:', error);
            res.status(500).json({
                success: false,
                message: 'Error searching student results',
                error: error.message
            });
        }
    });

    return router;
};