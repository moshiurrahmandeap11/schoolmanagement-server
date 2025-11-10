const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (gradingCollection) => {

    // GET all grading systems
    router.get('/', async (req, res) => {
        try {
            const gradings = await gradingCollection.find({}).sort({ createdAt: -1 }).toArray();
            
            res.json({
                success: true,
                data: gradings,
                message: 'Grading systems fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching grading systems:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching grading systems',
                error: error.message
            });
        }
    });

    // GET single grading system by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid grading ID'
                });
            }

            const grading = await gradingCollection.findOne({ _id: new ObjectId(id) });
            
            if (!grading) {
                return res.status(404).json({
                    success: false,
                    message: 'Grading system not found'
                });
            }

            res.json({
                success: true,
                data: grading,
                message: 'Grading system fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching grading system:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching grading system',
                error: error.message
            });
        }
    });

    // CREATE new grading system
    router.post('/', async (req, res) => {
        try {
            const gradingData = req.body;

            // Validate required fields
            if (!gradingData.name || !gradingData.totalMarks || !gradingData.passMarks) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, total marks and pass marks are required'
                });
            }

            // Validate grade ranges
            if (!gradingData.gradeRanges || !Array.isArray(gradingData.gradeRanges) || gradingData.gradeRanges.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'At least one grade range is required'
                });
            }

            const newGrading = {
                name: gradingData.name,
                totalMarks: parseFloat(gradingData.totalMarks),
                passMarks: parseFloat(gradingData.passMarks),
                optionalSubjectDeduction: parseFloat(gradingData.optionalSubjectDeduction || 0),
                isSpecialGrading: gradingData.isSpecialGrading || false,
                gradeRanges: gradingData.gradeRanges.map(range => ({
                    letterGrade: range.letterGrade,
                    minMarks: parseFloat(range.minMarks),
                    maxMarks: parseFloat(range.maxMarks),
                    gradePoint: parseFloat(range.gradePoint)
                })),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await gradingCollection.insertOne(newGrading);
            
            res.status(201).json({
                success: true,
                message: 'Grading system created successfully',
                data: {
                    _id: result.insertedId,
                    ...newGrading
                }
            });
        } catch (error) {
            console.error('Error creating grading system:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating grading system',
                error: error.message
            });
        }
    });

    // UPDATE grading system
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const gradingData = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid grading ID'
                });
            }

            // Validate required fields
            if (!gradingData.name || !gradingData.totalMarks || !gradingData.passMarks) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, total marks and pass marks are required'
                });
            }

            const updatedGrading = {
                name: gradingData.name,
                totalMarks: parseFloat(gradingData.totalMarks),
                passMarks: parseFloat(gradingData.passMarks),
                optionalSubjectDeduction: parseFloat(gradingData.optionalSubjectDeduction || 0),
                isSpecialGrading: gradingData.isSpecialGrading || false,
                gradeRanges: gradingData.gradeRanges.map(range => ({
                    letterGrade: range.letterGrade,
                    minMarks: parseFloat(range.minMarks),
                    maxMarks: parseFloat(range.maxMarks),
                    gradePoint: parseFloat(range.gradePoint)
                })),
                updatedAt: new Date()
            };

            const result = await gradingCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedGrading }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Grading system not found'
                });
            }

            res.json({
                success: true,
                message: 'Grading system updated successfully',
                data: {
                    _id: id,
                    ...updatedGrading
                }
            });
        } catch (error) {
            console.error('Error updating grading system:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating grading system',
                error: error.message
            });
        }
    });

    // DELETE grading system
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid grading ID'
                });
            }

            const result = await gradingCollection.deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Grading system not found'
                });
            }

            res.json({
                success: true,
                message: 'Grading system deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting grading system:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting grading system',
                error: error.message
            });
        }
    });

    return router;
};