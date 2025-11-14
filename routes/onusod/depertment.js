const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const upload = require('../../middleware/upload');

module.exports = (departmentCollection) => {
    
    // GET all departments
    router.get('/', async (req, res) => {
        try {
            const departments = await departmentCollection.aggregate([
                {
                    $lookup: {
                        from: 'faculties',
                        localField: 'facultyId',
                        foreignField: '_id',
                        as: 'faculty'
                    }
                },
                {
                    $unwind: {
                        path: '$faculty',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $sort: { createdAt: -1 }
                },
                {
                    $project: {
                        name: 1,
                        description: 1,
                        image: 1,
                        facultyId: 1,
                        facultyName: '$faculty.name',
                        createdAt: 1,
                        updatedAt: 1
                    }
                }
            ]).toArray();
                
            res.status(200).json({
                success: true,
                data: departments
            });
        } catch (error) {
            console.error('Error fetching departments:', error);
            res.status(500).json({
                success: false,
                message: 'বিভাগ লোড করতে সমস্যা হয়েছে'
            });
        }
    });

    // GET single department by ID
    router.get('/:id', async (req, res) => {
        try {
            const department = await departmentCollection.aggregate([
                {
                    $match: { _id: new ObjectId(req.params.id) }
                },
                {
                    $lookup: {
                        from: 'faculties',
                        localField: 'facultyId',
                        foreignField: '_id',
                        as: 'faculty'
                    }
                },
                {
                    $unwind: {
                        path: '$faculty',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        name: 1,
                        description: 1,
                        image: 1,
                        facultyId: 1,
                        facultyName: '$faculty.name',
                        createdAt: 1,
                        updatedAt: 1
                    }
                }
            ]).next();

            if (!department) {
                return res.status(404).json({
                    success: false,
                    message: 'বিভাগ পাওয়া যায়নি'
                });
            }
            
            res.status(200).json({
                success: true,
                data: department
            });
        } catch (error) {
            console.error('Error fetching department:', error);
            res.status(500).json({
                success: false,
                message: 'বিভাগ লোড করতে সমস্যা হয়েছে'
            });
        }
    });

    // POST create new department
    router.post('/', upload.single('image'), async (req, res) => {
        try {
            const { name, description, facultyId, facultyName } = req.body;

            // Validation
            if (!name || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'বিভাগের নাম প্রয়োজন'
                });
            }

            if (!description || !description.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'বিবরণ প্রয়োজন'
                });
            }

            if (!facultyId || !facultyName) {
                return res.status(400).json({
                    success: false,
                    message: 'ফ্যাকাল্টি নির্বাচন প্রয়োজন'
                });
            }

            // Check if department already exists in the same faculty
            const existingDepartment = await departmentCollection.findOne({ 
                name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
                facultyId: facultyId
            });

            if (existingDepartment) {
                return res.status(400).json({
                    success: false,
                    message: 'এই ফ্যাকাল্টিতে একই নামের বিভাগ ইতিমধ্যে存在'
                });
            }

            const departmentData = {
                name: name.trim(),
                description: description.trim(),
                facultyId: facultyId.trim(),
                facultyName: facultyName.trim(),
                image: req.file ? `/uploads/${req.file.filename}` : null,
                slug: name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, ''),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await departmentCollection.insertOne(departmentData);

            res.status(201).json({
                success: true,
                message: 'বিভাগ সফলভাবে তৈরি হয়েছে',
                data: {
                    _id: result.insertedId,
                    ...departmentData
                }
            });
        } catch (error) {
            console.error('Error creating department:', error);
            res.status(500).json({
                success: false,
                message: 'বিভাগ তৈরি করতে সমস্যা হয়েছে'
            });
        }
    });

    // PUT update department
    router.put('/:id', upload.single('image'), async (req, res) => {
        try {
            const { name, description, facultyId, facultyName } = req.body;

            // Validation
            if (!name || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'বিভাগের নাম প্রয়োজন'
                });
            }

            if (!description || !description.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'বিবরণ প্রয়োজন'
                });
            }

            if (!facultyId || !facultyName) {
                return res.status(400).json({
                    success: false,
                    message: 'ফ্যাকাল্টি নির্বাচন প্রয়োজন'
                });
            }

            // Check if department already exists in the same faculty (excluding current department)
            const existingDepartment = await departmentCollection.findOne({ 
                name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
                facultyId: facultyId,
                _id: { $ne: new ObjectId(req.params.id) }
            });

            if (existingDepartment) {
                return res.status(400).json({
                    success: false,
                    message: 'এই ফ্যাকাল্টিতে একই নামের বিভাগ ইতিমধ্যে存在'
                });
            }

            const updateData = {
                name: name.trim(),
                description: description.trim(),
                facultyId: facultyId.trim(),
                facultyName: facultyName.trim(),
                slug: name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, ''),
                updatedAt: new Date()
            };

            // If new image uploaded, update it
            if (req.file) {
                updateData.image = `/uploads/${req.file.filename}`;
            }

            const result = await departmentCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: updateData }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'বিভাগ পাওয়া যায়নি'
                });
            }

            res.status(200).json({
                success: true,
                message: 'বিভাগ সফলভাবে আপডেট হয়েছে'
            });
        } catch (error) {
            console.error('Error updating department:', error);
            res.status(500).json({
                success: false,
                message: 'বিভাগ আপডেট করতে সমস্যা হয়েছে'
            });
        }
    });

    // DELETE department
    router.delete('/:id', async (req, res) => {
        try {
            const result = await departmentCollection.deleteOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'বিভাগ পাওয়া যায়নি'
                });
            }

            res.status(200).json({
                success: true,
                message: 'বিভাগ সফলভাবে ডিলিট হয়েছে'
            });
        } catch (error) {
            console.error('Error deleting department:', error);
            res.status(500).json({
                success: false,
                message: 'বিভাগ ডিলিট করতে সমস্যা হয়েছে'
            });
        }
    });

    // GET departments by faculty
    router.get('/faculty/:facultyId', async (req, res) => {
        try {
            const departments = await departmentCollection.find({ 
                facultyId: req.params.facultyId 
            }).sort({ name: 1 }).toArray();

            res.status(200).json({
                success: true,
                data: departments
            });
        } catch (error) {
            console.error('Error fetching departments by faculty:', error);
            res.status(500).json({
                success: false,
                message: 'বিভাগ লোড করতে সমস্যা হয়েছে'
            });
        }
    });

    return router;
};