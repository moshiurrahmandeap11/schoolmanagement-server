const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (dividePathokromCollection) => {

    // Get all divided pathokrom
    router.get('/', async (req, res) => {
        try {
            const pathokroms = await dividePathokromCollection.find({}).toArray();
            
            res.status(200).json({
                success: true,
                message: 'Pathokrom data fetched successfully',
                data: pathokroms
            });
        } catch (error) {
            console.error('Error fetching pathokrom:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch pathokrom data',
                error: error.message
            });
        }
    });

    // Create new pathokrom division
    router.post('/', async (req, res) => {
        try {
            const { 
                className, 
                sectionName, 
                subjectName, 
                isOptional, 
                isExtraSubject, 
                extraSubjectsNote, 
                selectedStudents 
            } = req.body;

            // Validation
            if (!className || className.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Class name is required'
                });
            }

            if (!sectionName || sectionName.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Section name is required'
                });
            }

            if (!subjectName || subjectName.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Subject name is required'
                });
            }

            if (!selectedStudents || !Array.isArray(selectedStudents) || selectedStudents.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'At least one student must be selected'
                });
            }

            // Check if this subject is already assigned to any of the selected students
            const existingAssignments = await dividePathokromCollection.find({
                'selectedStudents.studentId': { $in: selectedStudents.map(s => s.studentId) },
                subjectName: subjectName.trim(),
                className: className.trim(),
                sectionName: sectionName.trim()
            }).toArray();

            if (existingAssignments.length > 0) {
                const conflictedStudents = existingAssignments.flatMap(assignment => 
                    assignment.selectedStudents
                        .filter(s => selectedStudents.some(ss => ss.studentId === s.studentId))
                        .map(s => s.studentName)
                );

                return res.status(400).json({
                    success: false,
                    message: `Some students already have this subject assigned: ${conflictedStudents.join(', ')}`
                });
            }

            const newPathokrom = {
                className: className.trim(),
                sectionName: sectionName.trim(),
                subjectName: subjectName.trim(),
                isOptional: Boolean(isOptional),
                isExtraSubject: Boolean(isExtraSubject),
                extraSubjectsNote: extraSubjectsNote ? extraSubjectsNote.trim() : '',
                selectedStudents: selectedStudents.map(student => ({
                    studentId: student.studentId,
                    studentName: student.studentName,
                    rollNumber: student.rollNumber
                })),
                totalStudents: selectedStudents.length,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await dividePathokromCollection.insertOne(newPathokrom);

            res.status(201).json({
                success: true,
                message: 'Pathokrom divided successfully',
                data: {
                    _id: result.insertedId,
                    ...newPathokrom
                }
            });
        } catch (error) {
            console.error('Error creating pathokrom division:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to divide pathokrom',
                error: error.message
            });
        }
    });

    // Update pathokrom division
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { 
                className, 
                sectionName, 
                subjectName, 
                isOptional, 
                isExtraSubject, 
                extraSubjectsNote, 
                selectedStudents 
            } = req.body;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid pathokrom ID'
                });
            }

            // Validation
            if (!className || className.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Class name is required'
                });
            }

            if (!sectionName || sectionName.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Section name is required'
                });
            }

            if (!subjectName || subjectName.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Subject name is required'
                });
            }

            if (!selectedStudents || !Array.isArray(selectedStudents) || selectedStudents.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'At least one student must be selected'
                });
            }

            // Check if pathokrom exists
            const existingPathokrom = await dividePathokromCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingPathokrom) {
                return res.status(404).json({
                    success: false,
                    message: 'Pathokrom division not found'
                });
            }

            // Check for conflicts with other pathokrom divisions (excluding current one)
            const existingAssignments = await dividePathokromCollection.find({
                _id: { $ne: new ObjectId(id) },
                'selectedStudents.studentId': { $in: selectedStudents.map(s => s.studentId) },
                subjectName: subjectName.trim(),
                className: className.trim(),
                sectionName: sectionName.trim()
            }).toArray();

            if (existingAssignments.length > 0) {
                const conflictedStudents = existingAssignments.flatMap(assignment => 
                    assignment.selectedStudents
                        .filter(s => selectedStudents.some(ss => ss.studentId === s.studentId))
                        .map(s => s.studentName)
                );

                return res.status(400).json({
                    success: false,
                    message: `Some students already have this subject assigned in other divisions: ${conflictedStudents.join(', ')}`
                });
            }

            const updatedPathokrom = {
                className: className.trim(),
                sectionName: sectionName.trim(),
                subjectName: subjectName.trim(),
                isOptional: Boolean(isOptional),
                isExtraSubject: Boolean(isExtraSubject),
                extraSubjectsNote: extraSubjectsNote ? extraSubjectsNote.trim() : '',
                selectedStudents: selectedStudents.map(student => ({
                    studentId: student.studentId,
                    studentName: student.studentName,
                    rollNumber: student.rollNumber
                })),
                totalStudents: selectedStudents.length,
                updatedAt: new Date()
            };

            const result = await dividePathokromCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedPathokrom }
            );

            if (result.modifiedCount === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No changes made to the pathokrom division'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Pathokrom division updated successfully',
                data: {
                    _id: id,
                    ...updatedPathokrom,
                    isActive: existingPathokrom.isActive,
                    createdAt: existingPathokrom.createdAt
                }
            });
        } catch (error) {
            console.error('Error updating pathokrom division:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update pathokrom division',
                error: error.message
            });
        }
    });

    // Delete pathokrom division
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid pathokrom ID'
                });
            }

            // Check if pathokrom exists
            const existingPathokrom = await dividePathokromCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingPathokrom) {
                return res.status(404).json({
                    success: false,
                    message: 'Pathokrom division not found'
                });
            }

            const result = await dividePathokromCollection.deleteOne({ 
                _id: new ObjectId(id) 
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Pathokrom division not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Pathokrom division deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting pathokrom division:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete pathokrom division',
                error: error.message
            });
        }
    });

    // Get pathokrom by class and section
    router.get('/class/:className/section/:sectionName', async (req, res) => {
        try {
            const { className, sectionName } = req.params;

            const pathokroms = await dividePathokromCollection.find({
                className: className,
                sectionName: sectionName
            }).toArray();

            res.status(200).json({
                success: true,
                message: 'Pathokrom data fetched successfully',
                data: pathokroms
            });
        } catch (error) {
            console.error('Error fetching pathokrom by class and section:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch pathokrom data',
                error: error.message
            });
        }
    });

    return router;
};