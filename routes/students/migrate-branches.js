const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (migrateBranchesCollection) => {

    // Create branch migration record
    router.post('/', async (req, res) => {
        try {
            const { 
                classId, 
                batchId, 
                sectionId, 
                monthlyFeeFrom,
                sendAttendanceSMS,
                migrateTo,
                branchId,
                studentIds 
            } = req.body;

            console.log('Branch migration request:', { 
                classId, 
                batchId, 
                sectionId, 
                monthlyFeeFrom,
                sendAttendanceSMS,
                migrateTo,
                branchId,
                studentCount: studentIds?.length 
            });

            // Validation
            if (!classId) {
                return res.status(400).json({
                    success: false,
                    message: 'ক্লাস নির্বাচন করুন'
                });
            }

            if (!migrateTo) {
                return res.status(400).json({
                    success: false,
                    message: 'মাইগ্রেশন টাইপ নির্বাচন করুন'
                });
            }

            if (!branchId) {
                return res.status(400).json({
                    success: false,
                    message: 'ব্রাঞ্চ নির্বাচন করুন'
                });
            }

            if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'কমপক্ষে একজন শিক্ষার্থী নির্বাচন করুন'
                });
            }

            // Create migration record
            const migrationRecord = {
                classId: new ObjectId(classId),
                batchId: batchId ? new ObjectId(batchId) : null,
                sectionId: sectionId ? new ObjectId(sectionId) : null,
                monthlyFeeFrom: monthlyFeeFrom || null,
                sendAttendanceSMS: Boolean(sendAttendanceSMS),
                migrateTo: migrateTo,
                branchId: new ObjectId(branchId),
                studentIds: studentIds.map(id => new ObjectId(id)),
                totalStudents: studentIds.length,
                migratedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await migrateBranchesCollection.insertOne(migrationRecord);

            res.status(201).json({
                success: true,
                message: `${studentIds.length} জন শিক্ষার্থী ব্রাঞ্চে মাইগ্রেট করা হয়েছে`,
                data: {
                    _id: result.insertedId,
                    ...migrationRecord
                }
            });
        } catch (error) {
            console.error('Error creating branch migration:', error);
            res.status(500).json({
                success: false,
                message: 'ব্রাঞ্চ মাইগ্রেশন করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // Get all branch migration records
    router.get('/', async (req, res) => {
        try {
            const migrationRecords = await migrateBranchesCollection.aggregate([
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
                        from: 'branches',
                        localField: 'branchId',
                        foreignField: '_id',
                        as: 'branch'
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
                        path: '$branch',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $sort: { migratedAt: -1 }
                }
            ]).toArray();

            res.status(200).json({
                success: true,
                message: 'ব্রাঞ্চ মাইগ্রেশন রেকর্ড ফেচ করা হয়েছে',
                data: migrationRecords
            });
        } catch (error) {
            console.error('Error fetching branch migration records:', error);
            res.status(500).json({
                success: false,
                message: 'ব্রাঞ্চ মাইগ্রেশন রেকর্ড লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // Get branch migration by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const migrationRecord = await migrateBranchesCollection.aggregate([
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
                        from: 'branches',
                        localField: 'branchId',
                        foreignField: '_id',
                        as: 'branch'
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
                        path: '$branch',
                        preserveNullAndEmptyArrays: true
                    }
                }
            ]).toArray();

            if (!migrationRecord || migrationRecord.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'মাইগ্রেশন রেকর্ড পাওয়া যায়নি'
                });
            }

            res.status(200).json({
                success: true,
                message: 'মাইগ্রেশন রেকর্ড ফেচ করা হয়েছে',
                data: migrationRecord[0]
            });
        } catch (error) {
            console.error('Error fetching branch migration record:', error);
            res.status(500).json({
                success: false,
                message: 'মাইগ্রেশন রেকর্ড লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // Delete branch migration record
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const result = await migrateBranchesCollection.deleteOne({ 
                _id: new ObjectId(id) 
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'মাইগ্রেশন রেকর্ড পাওয়া যায়নি'
                });
            }

            res.status(200).json({
                success: true,
                message: 'মাইগ্রেশন রেকর্ড ডিলিট করা হয়েছে'
            });
        } catch (error) {
            console.error('Error deleting branch migration record:', error);
            res.status(500).json({
                success: false,
                message: 'মাইগ্রেশন রেকর্ড ডিলিট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    return router;
};