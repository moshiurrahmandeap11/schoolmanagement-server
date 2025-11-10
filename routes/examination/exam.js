const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (examCollection) => {

    // GET all exams with filters
    router.get('/', async (req, res) => {
        try {
            const { categoryId, classId, sectionId, sessionId } = req.query;
            
            let filter = {};
            
            if (categoryId && categoryId !== 'all') {
                filter.categoryId = new ObjectId(categoryId);
            }
            
            if (classId && classId !== 'all') {
                filter.classId = new ObjectId(classId);
            }
            
            if (sectionId && sectionId !== 'all') {
                filter.sectionId = new ObjectId(sectionId);
            }
            
            if (sessionId && sessionId !== 'all') {
                filter.sessionId = new ObjectId(sessionId);
            }

            const exams = await examCollection.aggregate([
                {
                    $match: filter
                },
                {
                    $lookup: {
                        from: 'exam-categories',
                        localField: 'categoryId',
                        foreignField: '_id',
                        as: 'category'
                    }
                },
                {
                    $lookup: {
                        from: 'classes',
                        localField: 'classId',
                        foreignField: '_id',
                        as: 'class'
                    }
                },
                {
                    $lookup: {
                        from: 'sections',
                        localField: 'sectionId',
                        foreignField: '_id',
                        as: 'section'
                    }
                },
                {
                    $lookup: {
                        from: 'sessions',
                        localField: 'sessionId',
                        foreignField: '_id',
                        as: 'session'
                    }
                },
                {
                    $lookup: {
                        from: 'grading',
                        localField: 'gradingId',
                        foreignField: '_id',
                        as: 'grading'
                    }
                },
                {
                    $sort: { date: 1, startTime: 1 }
                }
            ]).toArray();
            
            // Format the response
            const formattedExams = exams.map(exam => ({
                _id: exam._id,
                name: exam.name,
                categoryName: exam.category[0]?.name || 'N/A',
                className: exam.class[0]?.name || 'N/A',
                sectionName: exam.section[0]?.name || 'N/A',
                sessionName: exam.session[0]?.name || 'N/A',
                gradingName: exam.grading[0]?.name || 'N/A',
                year: exam.year,
                date: exam.date,
                startTime: exam.startTime,
                endTime: exam.endTime,
                status: exam.status,
                combinedPercentage: exam.combinedPercentage,
                createdAt: exam.createdAt
            }));

            res.json({
                success: true,
                data: formattedExams,
                message: 'Exams fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching exams:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching exams',
                error: error.message
            });
        }
    });

    // GET single exam by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid exam ID'
                });
            }

            const exams = await examCollection.aggregate([
                {
                    $match: { _id: new ObjectId(id) }
                },
                {
                    $lookup: {
                        from: 'exam-categories',
                        localField: 'categoryId',
                        foreignField: '_id',
                        as: 'category'
                    }
                },
                {
                    $lookup: {
                        from: 'classes',
                        localField: 'classId',
                        foreignField: '_id',
                        as: 'class'
                    }
                },
                {
                    $lookup: {
                        from: 'sections',
                        localField: 'sectionId',
                        foreignField: '_id',
                        as: 'section'
                    }
                },
                {
                    $lookup: {
                        from: 'sessions',
                        localField: 'sessionId',
                        foreignField: '_id',
                        as: 'session'
                    }
                },
                {
                    $lookup: {
                        from: 'grading',
                        localField: 'gradingId',
                        foreignField: '_id',
                        as: 'grading'
                    }
                }
            ]).toArray();

            if (exams.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Exam not found'
                });
            }

            const exam = exams[0];
            const formattedExam = {
                _id: exam._id,
                name: exam.name,
                categoryId: exam.categoryId,
                categoryName: exam.category[0]?.name || 'N/A',
                classId: exam.classId,
                className: exam.class[0]?.name || 'N/A',
                sectionId: exam.sectionId,
                sectionName: exam.section[0]?.name || 'N/A',
                sessionId: exam.sessionId,
                sessionName: exam.session[0]?.name || 'N/A',
                gradingId: exam.gradingId,
                gradingName: exam.grading[0]?.name || 'N/A',
                year: exam.year,
                date: exam.date,
                startTime: exam.startTime,
                endTime: exam.endTime,
                note: exam.note,
                status: exam.status,
                combinedPercentage: exam.combinedPercentage,
                createdAt: exam.createdAt
            };

            res.json({
                success: true,
                data: formattedExam,
                message: 'Exam fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching exam:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching exam',
                error: error.message
            });
        }
    });

    // CREATE new exam
    router.post('/', async (req, res) => {
        try {
            const examData = req.body;

            // Validate required fields
            if (!examData.name || !examData.categoryId || !examData.classId || 
                !examData.sectionId || !examData.sessionId || !examData.gradingId ||
                !examData.year || !examData.date || !examData.startTime || !examData.endTime) {
                return res.status(400).json({
                    success: false,
                    message: 'All required fields must be filled'
                });
            }

            // Validate time
            if (examData.startTime >= examData.endTime) {
                return res.status(400).json({
                    success: false,
                    message: 'End time must be after start time'
                });
            }

            const newExam = {
                name: examData.name,
                categoryId: new ObjectId(examData.categoryId),
                classId: new ObjectId(examData.classId),
                sectionId: new ObjectId(examData.sectionId),
                sessionId: new ObjectId(examData.sessionId),
                gradingId: new ObjectId(examData.gradingId),
                year: parseInt(examData.year),
                date: new Date(examData.date),
                startTime: examData.startTime,
                endTime: examData.endTime,
                note: examData.note || '',
                status: examData.status || 'Draft',
                combinedPercentage: examData.combinedPercentage ? parseFloat(examData.combinedPercentage) : 0,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await examCollection.insertOne(newExam);
            
            res.status(201).json({
                success: true,
                message: 'Exam created successfully',
                data: {
                    _id: result.insertedId,
                    ...newExam
                }
            });
        } catch (error) {
            console.error('Error creating exam:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating exam',
                error: error.message
            });
        }
    });

    // UPDATE exam
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const examData = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid exam ID'
                });
            }

            // Validate required fields
            if (!examData.name || !examData.categoryId || !examData.classId || 
                !examData.sectionId || !examData.sessionId || !examData.gradingId ||
                !examData.year || !examData.date || !examData.startTime || !examData.endTime) {
                return res.status(400).json({
                    success: false,
                    message: 'All required fields must be filled'
                });
            }

            // Validate time
            if (examData.startTime >= examData.endTime) {
                return res.status(400).json({
                    success: false,
                    message: 'End time must be after start time'
                });
            }

            const updateData = {
                name: examData.name,
                categoryId: new ObjectId(examData.categoryId),
                classId: new ObjectId(examData.classId),
                sectionId: new ObjectId(examData.sectionId),
                sessionId: new ObjectId(examData.sessionId),
                gradingId: new ObjectId(examData.gradingId),
                year: parseInt(examData.year),
                date: new Date(examData.date),
                startTime: examData.startTime,
                endTime: examData.endTime,
                note: examData.note || '',
                status: examData.status || 'Draft',
                combinedPercentage: examData.combinedPercentage ? parseFloat(examData.combinedPercentage) : 0,
                updatedAt: new Date()
            };

            const result = await examCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Exam not found'
                });
            }

            res.json({
                success: true,
                message: 'Exam updated successfully',
                data: {
                    _id: id,
                    ...updateData
                }
            });
        } catch (error) {
            console.error('Error updating exam:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating exam',
                error: error.message
            });
        }
    });

    // DELETE exam
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid exam ID'
                });
            }

            const result = await examCollection.deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Exam not found'
                });
            }

            res.json({
                success: true,
                message: 'Exam deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting exam:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting exam',
                error: error.message
            });
        }
    });

    return router;
};