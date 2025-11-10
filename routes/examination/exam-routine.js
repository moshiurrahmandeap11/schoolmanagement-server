const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const upload = require('../../middleware/upload');

module.exports = (examRoutineCollection) => {

    // GET all exam routines with population
    router.get('/', async (req, res) => {
        try {
            const routines = await examRoutineCollection.aggregate([
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
                        from: 'subjects',
                        localField: 'subjectId',
                        foreignField: '_id',
                        as: 'subject'
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
                    $sort: { date: 1, startTime: 1 }
                }
            ]).toArray();
            
            // Format the response
            const formattedRoutines = routines.map(routine => ({
                _id: routine._id,
                className: routine.class[0]?.name || 'N/A',
                subjectName: routine.subject[0]?.name || 'N/A',
                sessionName: routine.session[0]?.name || 'N/A',
                date: routine.date,
                startTime: routine.startTime,
                endTime: routine.endTime,
                attachment: routine.attachment,
                createdAt: routine.createdAt
            }));

            res.json({
                success: true,
                data: formattedRoutines,
                message: 'Exam routines fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching exam routines:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching exam routines',
                error: error.message
            });
        }
    });

    // GET single exam routine by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid routine ID'
                });
            }

            const routines = await examRoutineCollection.aggregate([
                {
                    $match: { _id: new ObjectId(id) }
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
                        from: 'subjects',
                        localField: 'subjectId',
                        foreignField: '_id',
                        as: 'subject'
                    }
                },
                {
                    $lookup: {
                        from: 'sessions',
                        localField: 'sessionId',
                        foreignField: '_id',
                        as: 'session'
                    }
                }
            ]).toArray();

            if (routines.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Exam routine not found'
                });
            }

            const routine = routines[0];
            const formattedRoutine = {
                _id: routine._id,
                classId: routine.classId,
                className: routine.class[0]?.name || 'N/A',
                subjectId: routine.subjectId,
                subjectName: routine.subject[0]?.name || 'N/A',
                sessionId: routine.sessionId,
                sessionName: routine.session[0]?.name || 'N/A',
                date: routine.date,
                startTime: routine.startTime,
                endTime: routine.endTime,
                attachment: routine.attachment,
                createdAt: routine.createdAt
            };

            res.json({
                success: true,
                data: formattedRoutine,
                message: 'Exam routine fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching exam routine:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching exam routine',
                error: error.message
            });
        }
    });

    // CREATE new exam routine
    router.post('/', upload.single('attachment'), async (req, res) => {
        try {
            const routineData = req.body;
            const attachment = req.file;

            // Validate required fields
            if (!routineData.classId || !routineData.subjectId || !routineData.date || 
                !routineData.startTime || !routineData.endTime || !routineData.sessionId) {
                return res.status(400).json({
                    success: false,
                    message: 'All fields are required except attachment'
                });
            }

            // Validate time
            if (routineData.startTime >= routineData.endTime) {
                return res.status(400).json({
                    success: false,
                    message: 'End time must be after start time'
                });
            }

            const newRoutine = {
                classId: new ObjectId(routineData.classId),
                subjectId: new ObjectId(routineData.subjectId),
                sessionId: new ObjectId(routineData.sessionId),
                date: new Date(routineData.date),
                startTime: routineData.startTime,
                endTime: routineData.endTime,
                attachment: attachment ? `/api/uploads/${attachment.filename}` : null,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await examRoutineCollection.insertOne(newRoutine);
            
            res.status(201).json({
                success: true,
                message: 'Exam routine created successfully',
                data: {
                    _id: result.insertedId,
                    ...newRoutine
                }
            });
        } catch (error) {
            console.error('Error creating exam routine:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating exam routine',
                error: error.message
            });
        }
    });

    // UPDATE exam routine
    router.put('/:id', upload.single('attachment'), async (req, res) => {
        try {
            const { id } = req.params;
            const routineData = req.body;
            const attachment = req.file;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid routine ID'
                });
            }

            // Validate required fields
            if (!routineData.classId || !routineData.subjectId || !routineData.date || 
                !routineData.startTime || !routineData.endTime || !routineData.sessionId) {
                return res.status(400).json({
                    success: false,
                    message: 'All fields are required except attachment'
                });
            }

            // Validate time
            if (routineData.startTime >= routineData.endTime) {
                return res.status(400).json({
                    success: false,
                    message: 'End time must be after start time'
                });
            }

            const updateData = {
                classId: new ObjectId(routineData.classId),
                subjectId: new ObjectId(routineData.subjectId),
                sessionId: new ObjectId(routineData.sessionId),
                date: new Date(routineData.date),
                startTime: routineData.startTime,
                endTime: routineData.endTime,
                updatedAt: new Date()
            };

            // Add attachment if provided
            if (attachment) {
                updateData.attachment = `/api/uploads/${attachment.filename}`;
            }

            const result = await examRoutineCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Exam routine not found'
                });
            }

            res.json({
                success: true,
                message: 'Exam routine updated successfully',
                data: {
                    _id: id,
                    ...updateData
                }
            });
        } catch (error) {
            console.error('Error updating exam routine:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating exam routine',
                error: error.message
            });
        }
    });

    // DELETE exam routine
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid routine ID'
                });
            }

            const result = await examRoutineCollection.deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Exam routine not found'
                });
            }

            res.json({
                success: true,
                message: 'Exam routine deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting exam routine:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting exam routine',
                error: error.message
            });
        }
    });

    return router;
};