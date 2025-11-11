const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (migrateStatusCollection, studentsCollection) => {

    // Get students by filters for selection - FIXED VERSION
    router.get('/students', async (req, res) => {
        try {
            const { classId, batchId, sectionId, sessionId } = req.query;
            
            console.log('Query parameters:', { classId, batchId, sectionId, sessionId });
            
            let filter = {};
            
            if (classId && classId !== 'null' && classId !== 'undefined') {
                try {
                    filter.classId = new ObjectId(classId);
                } catch (error) {
                    console.error('Invalid classId:', classId);
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid class ID format'
                    });
                }
            }
            
            if (batchId && batchId !== 'null' && batchId !== 'undefined') {
                try {
                    filter.batchId = new ObjectId(batchId);
                } catch (error) {
                    console.error('Invalid batchId:', batchId);
                    // Continue without batch filter if invalid
                }
            }
            
            if (sectionId && sectionId !== 'null' && sectionId !== 'undefined') {
                try {
                    filter.sectionId = new ObjectId(sectionId);
                } catch (error) {
                    console.error('Invalid sectionId:', sectionId);
                    // Continue without section filter if invalid
                }
            }
            
            if (sessionId && sessionId !== 'null' && sessionId !== 'undefined') {
                try {
                    filter.sessionId = new ObjectId(sessionId);
                } catch (error) {
                    console.error('Invalid sessionId:', sessionId);
                    // Continue without session filter if invalid
                }
            }

            console.log('Final filter:', filter);

            // If no classId provided, return empty array
            if (!filter.classId) {
                return res.status(200).json({
                    success: true,
                    message: 'No class selected',
                    data: []
                });
            }

            const students = await studentsCollection.aggregate([
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
                        from: 'batches',
                        localField: 'batchId',
                        foreignField: '_id',
                        as: 'batch'
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
                    $unwind: {
                        path: '$class',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $unwind: {
                        path: '$batch',
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
                    $unwind: {
                        path: '$session',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        _id: 1,
                        studentId: 1,
                        name: 1,
                        classRoll: 1,
                        status: 1,
                        photo: 1,
                        'class.name': 1,
                        'batch.name': 1,
                        'section.name': 1,
                        'session.name': 1
                    }
                },
                {
                    $sort: { classRoll: 1 }
                }
            ]).toArray();

            console.log(`Found ${students.length} students`);

            res.status(200).json({
                success: true,
                message: 'Students fetched successfully',
                data: students
            });
        } catch (error) {
            console.error('Error fetching students:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch students',
                error: error.message
            });
        }
    });

    // Create migration status for multiple students - FIXED VERSION
    router.post('/', async (req, res) => {
        try {
            const { 
                classId, 
                batchId, 
                sectionId, 
                sessionId, 
                status,
                studentIds 
            } = req.body;

            console.log('Migration request:', { classId, batchId, sectionId, sessionId, status, studentIds });

            // Validation
            if (!classId) {
                return res.status(400).json({
                    success: false,
                    message: 'Class selection is required'
                });
            }

            if (!status) {
                return res.status(400).json({
                    success: false,
                    message: 'Status selection is required'
                });
            }

            if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'At least one student must be selected'
                });
            }

            // Validate ObjectIds
            let validStudentIds;
            try {
                validStudentIds = studentIds.map(id => new ObjectId(id));
            } catch (error) {
                console.error('Invalid student IDs:', error);
                return res.status(400).json({
                    success: false,
                    message: 'Invalid student ID format'
                });
            }

            // Get students data
            const students = await studentsCollection.find({
                _id: { $in: validStudentIds }
            }).toArray();

            if (students.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No students found with the provided IDs'
                });
            }

            console.log(`Found ${students.length} students to update`);

            // Prepare migration records
            const migrationRecords = students.map(student => ({
                studentId: student._id,
                studentName: student.name,
                studentIdNumber: student.studentId,
                classId: new ObjectId(classId),
                batchId: batchId ? new ObjectId(batchId) : null,
                sectionId: sectionId ? new ObjectId(sectionId) : null,
                sessionId: sessionId ? new ObjectId(sessionId) : null,
                previousStatus: student.status,
                newStatus: status,
                migratedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
            }));

            // Insert migration records
            const migrationResult = await migrateStatusCollection.insertMany(migrationRecords);

            // Update students status
            const updateResult = await studentsCollection.updateMany(
                { _id: { $in: validStudentIds } },
                { 
                    $set: { 
                        status: status,
                        updatedAt: new Date()
                    } 
                }
            );

            console.log(`Updated ${updateResult.modifiedCount} students`);

            res.status(201).json({
                success: true,
                message: `Status updated for ${updateResult.modifiedCount} students`,
                data: {
                    migrationRecords: migrationResult.insertedCount,
                    updatedStudents: updateResult.modifiedCount
                }
            });
        } catch (error) {
            console.error('Error creating migration status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update student status',
                error: error.message
            });
        }
    });

    // Get all migration status records
    router.get('/', async (req, res) => {
        try {
            const migrationRecords = await migrateStatusCollection.aggregate([
                {
                    $lookup: {
                        from: 'students',
                        localField: 'studentId',
                        foreignField: '_id',
                        as: 'student'
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
                        from: 'batches',
                        localField: 'batchId',
                        foreignField: '_id',
                        as: 'batch'
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
                    $unwind: {
                        path: '$student',
                        preserveNullAndEmptyArrays: true
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
                        path: '$batch',
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
                    $unwind: {
                        path: '$session',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $sort: { createdAt: -1 }
                }
            ]).toArray();

            res.status(200).json({
                success: true,
                message: 'Migration records fetched successfully',
                data: migrationRecords
            });
        } catch (error) {
            console.error('Error fetching migration records:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch migration records',
                error: error.message
            });
        }
    });

    // Get migration records by filters
    router.get('/filter', async (req, res) => {
        try {
            const { classId, batchId, sectionId, sessionId, status } = req.query;
            
            let filter = {};
            
            if (classId) {
                filter.classId = new ObjectId(classId);
            }
            
            if (batchId) {
                filter.batchId = new ObjectId(batchId);
            }
            
            if (sectionId) {
                filter.sectionId = new ObjectId(sectionId);
            }
            
            if (sessionId) {
                filter.sessionId = new ObjectId(sessionId);
            }
            
            if (status) {
                filter.newStatus = status;
            }

            const migrationRecords = await migrateStatusCollection.aggregate([
                {
                    $match: filter
                },
                {
                    $lookup: {
                        from: 'students',
                        localField: 'studentId',
                        foreignField: '_id',
                        as: 'student'
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
                        from: 'batches',
                        localField: 'batchId',
                        foreignField: '_id',
                        as: 'batch'
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
                    $unwind: {
                        path: '$student',
                        preserveNullAndEmptyArrays: true
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
                        path: '$batch',
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
                    $unwind: {
                        path: '$session',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $sort: { migratedAt: -1 }
                }
            ]).toArray();

            res.status(200).json({
                success: true,
                message: 'Filtered migration records fetched successfully',
                data: migrationRecords
            });
        } catch (error) {
            console.error('Error fetching filtered migration records:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch migration records',
                error: error.message
            });
        }
    });

    return router;
};