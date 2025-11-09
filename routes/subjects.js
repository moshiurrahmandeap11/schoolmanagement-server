const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (subjectsCollection) => {

    // Get all subjects with filtering
    router.get('/', async (req, res) => {
        try {
            const { subjectId, classId, sectionId } = req.query;
            
            let filter = {};
            
            if (subjectId) {
                filter._id = new ObjectId(subjectId);
            }
            
            if (classId) {
                filter.classId = new ObjectId(classId);
            }
            
            if (sectionId) {
                filter.sectionId = new ObjectId(sectionId);
            }

            const subjects = await subjectsCollection.aggregate([
                {
                    $match: filter
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
                    $unwind: {
                        path: '$class',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $unwind: {
                        path: '$section',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        name: 1,
                        code: 1,
                        classId: 1,
                        sectionId: 1,
                        isOptional: 1,
                        totalMarks: 1,
                        writtenPassMark: 1,
                        mcqPassMark: 1,
                        practicalPassMark: 1,
                        ctPassMark: 1,
                        firstPaper: 1,
                        bothPapersTotalMarks: 1,
                        bothPapersMcqPassMark: 1,
                        bothPapersPracticalPassMark: 1,
                        bothPapersCtPassMark: 1,
                        isActive: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        'class.name': 1,
                        'section.name': 1
                    }
                },
                {
                    $sort: { createdAt: -1 }
                }
            ]).toArray();

            res.json({
                success: true,
                data: subjects,
                message: 'Subjects fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching subjects:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching subjects',
                error: error.message
            });
        }
    });

    // Create new subject
    router.post('/', async (req, res) => {
        try {
            const {
                name,
                code,
                classId,
                sectionId,
                isOptional,
                totalMarks,
                writtenPassMark,
                mcqPassMark,
                practicalPassMark,
                ctPassMark,
                firstPaper,
                bothPapersTotalMarks,
                bothPapersMcqPassMark,
                bothPapersPracticalPassMark,
                bothPapersCtPassMark
            } = req.body;

            if (!name || !code || !classId) {
                return res.status(400).json({
                    success: false,
                    message: 'Subject name, code, and class are required'
                });
            }

            // Check if subject code already exists
            const existingSubject = await subjectsCollection.findOne({
                code: code.trim(),
                classId: new ObjectId(classId)
            });

            if (existingSubject) {
                return res.status(400).json({
                    success: false,
                    message: 'এই ক্লাসে এই কোডের বিষয় ইতিমধ্যে存在 করে'
                });
            }

            const subjectData = {
                name: name.trim(),
                code: code.trim(),
                classId: new ObjectId(classId),
                sectionId: sectionId ? new ObjectId(sectionId) : null,
                isOptional: isOptional || false,
                totalMarks: totalMarks ? parseInt(totalMarks) : null,
                writtenPassMark: writtenPassMark ? parseInt(writtenPassMark) : null,
                mcqPassMark: mcqPassMark ? parseInt(mcqPassMark) : null,
                practicalPassMark: practicalPassMark ? parseInt(practicalPassMark) : null,
                ctPassMark: ctPassMark ? parseInt(ctPassMark) : null,
                firstPaper: firstPaper ? parseInt(firstPaper) : null,
                bothPapersTotalMarks: bothPapersTotalMarks ? parseInt(bothPapersTotalMarks) : null,
                bothPapersMcqPassMark: bothPapersMcqPassMark ? parseInt(bothPapersMcqPassMark) : null,
                bothPapersPracticalPassMark: bothPapersPracticalPassMark ? parseInt(bothPapersPracticalPassMark) : null,
                bothPapersCtPassMark: bothPapersCtPassMark ? parseInt(bothPapersCtPassMark) : null,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await subjectsCollection.insertOne(subjectData);

            res.json({
                success: true,
                data: { _id: result.insertedId, ...subjectData },
                message: 'Subject created successfully'
            });
        } catch (error) {
            console.error('Error creating subject:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating subject',
                error: error.message
            });
        }
    });

    // Update subject
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const {
                name,
                code,
                classId,
                sectionId,
                isOptional,
                totalMarks,
                writtenPassMark,
                mcqPassMark,
                practicalPassMark,
                ctPassMark,
                firstPaper,
                bothPapersTotalMarks,
                bothPapersMcqPassMark,
                bothPapersPracticalPassMark,
                bothPapersCtPassMark
            } = req.body;

            if (!name || !code || !classId) {
                return res.status(400).json({
                    success: false,
                    message: 'Subject name, code, and class are required'
                });
            }

            // Check if subject code already exists (excluding current subject)
            const existingSubject = await subjectsCollection.findOne({
                code: code.trim(),
                classId: new ObjectId(classId),
                _id: { $ne: new ObjectId(id) }
            });

            if (existingSubject) {
                return res.status(400).json({
                    success: false,
                    message: 'এই ক্লাসে এই কোডের বিষয় ইতিমধ্যে存在 করে'
                });
            }

            const updateData = {
                name: name.trim(),
                code: code.trim(),
                classId: new ObjectId(classId),
                sectionId: sectionId ? new ObjectId(sectionId) : null,
                isOptional: isOptional || false,
                totalMarks: totalMarks ? parseInt(totalMarks) : null,
                writtenPassMark: writtenPassMark ? parseInt(writtenPassMark) : null,
                mcqPassMark: mcqPassMark ? parseInt(mcqPassMark) : null,
                practicalPassMark: practicalPassMark ? parseInt(practicalPassMark) : null,
                ctPassMark: ctPassMark ? parseInt(ctPassMark) : null,
                firstPaper: firstPaper ? parseInt(firstPaper) : null,
                bothPapersTotalMarks: bothPapersTotalMarks ? parseInt(bothPapersTotalMarks) : null,
                bothPapersMcqPassMark: bothPapersMcqPassMark ? parseInt(bothPapersMcqPassMark) : null,
                bothPapersPracticalPassMark: bothPapersPracticalPassMark ? parseInt(bothPapersPracticalPassMark) : null,
                bothPapersCtPassMark: bothPapersCtPassMark ? parseInt(bothPapersCtPassMark) : null,
                updatedAt: new Date()
            };

            const result = await subjectsCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Subject not found'
                });
            }

            res.json({
                success: true,
                message: 'Subject updated successfully'
            });
        } catch (error) {
            console.error('Error updating subject:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating subject',
                error: error.message
            });
        }
    });

    // Delete subject
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const result = await subjectsCollection.deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Subject not found'
                });
            }

            res.json({
                success: true,
                message: 'Subject deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting subject:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting subject',
                error: error.message
            });
        }
    });

    // Get subjects by class and section
    router.get('/class/:classId', async (req, res) => {
        try {
            const { classId } = req.params;
            const { sectionId } = req.query;

            let filter = {
                classId: new ObjectId(classId),
                isActive: true
            };

            if (sectionId) {
                filter.sectionId = new ObjectId(sectionId);
            }

            const subjects = await subjectsCollection.find(filter).toArray();

            res.json({
                success: true,
                data: subjects
            });
        } catch (error) {
            console.error('Error fetching subjects by class:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching subjects',
                error: error.message
            });
        }
    });

    return router;
};