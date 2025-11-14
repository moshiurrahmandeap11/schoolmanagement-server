const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const upload = require('../../middleware/upload'); 

module.exports = (instituteJobsCollection) => {
    
    // GET all institute jobs
    router.get('/', async (req, res) => {
        try {
            const jobs = await instituteJobsCollection.find({}).sort({ createdAt: -1 }).toArray();
            res.status(200).json({
                success: true,
                data: jobs
            });
        } catch (error) {
            console.error('Error fetching institute jobs:', error);
            res.status(500).json({
                success: false,
                message: 'ইনস্টিটিউট জবস লোড করতে সমস্যা হয়েছে'
            });
        }
    });

    // GET single job by ID
    router.get('/:id', async (req, res) => {
        try {
            const job = await instituteJobsCollection.findOne({ _id: new ObjectId(req.params.id) });
            if (!job) {
                return res.status(404).json({
                    success: false,
                    message: 'জব পাওয়া যায়নি'
                });
            }
            res.status(200).json({
                success: true,
                data: job
            });
        } catch (error) {
            console.error('Error fetching job:', error);
            res.status(500).json({
                success: false,
                message: 'জব লোড করতে সমস্যা হয়েছে'
            });
        }
    });

    // POST create new job
    router.post('/', upload.single('attachment'), async (req, res) => {
        try {
            const { title, description, location, applicationDeadline, status } = req.body;

            // Validation
            if (!title || !description || !applicationDeadline) {
                return res.status(400).json({
                    success: false,
                    message: 'শিরোনাম, বিবরণ এবং আবেদনের শেষ তারিখ প্রয়োজন'
                });
            }

            const jobData = {
                title: title.trim(),
                description: description.trim(),
                location: location?.trim() || '',
                applicationDeadline: new Date(applicationDeadline),
                status: status || 'draft',
                attachment: req.file ? `/uploads/${req.file.filename}` : null,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await instituteJobsCollection.insertOne(jobData);

            res.status(201).json({
                success: true,
                message: 'জব সফলভাবে তৈরি হয়েছে',
                data: {
                    _id: result.insertedId,
                    ...jobData
                }
            });
        } catch (error) {
            console.error('Error creating job:', error);
            res.status(500).json({
                success: false,
                message: 'জব তৈরি করতে সমস্যা হয়েছে'
            });
        }
    });

    // PUT update job
    router.put('/:id', upload.single('attachment'), async (req, res) => {
        try {
            const { title, description, location, applicationDeadline, status } = req.body;

            // Validation
            if (!title || !description || !applicationDeadline) {
                return res.status(400).json({
                    success: false,
                    message: 'শিরোনাম, বিবরণ এবং আবেদনের শেষ তারিখ প্রয়োজন'
                });
            }

            const updateData = {
                title: title.trim(),
                description: description.trim(),
                location: location?.trim() || '',
                applicationDeadline: new Date(applicationDeadline),
                status: status || 'draft',
                updatedAt: new Date()
            };

            // If new file uploaded, update attachment
            if (req.file) {
                updateData.attachment = `/uploads/${req.file.filename}`;
            }

            const result = await instituteJobsCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: updateData }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'জব পাওয়া যায়নি'
                });
            }

            res.status(200).json({
                success: true,
                message: 'জব সফলভাবে আপডেট হয়েছে'
            });
        } catch (error) {
            console.error('Error updating job:', error);
            res.status(500).json({
                success: false,
                message: 'জব আপডেট করতে সমস্যা হয়েছে'
            });
        }
    });

    // DELETE job
    router.delete('/:id', async (req, res) => {
        try {
            const result = await instituteJobsCollection.deleteOne({ _id: new ObjectId(req.params.id) });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'জব পাওয়া যায়নি'
                });
            }

            res.status(200).json({
                success: true,
                message: 'জব সফলভাবে ডিলিট হয়েছে'
            });
        } catch (error) {
            console.error('Error deleting job:', error);
            res.status(500).json({
                success: false,
                message: 'জব ডিলিট করতে সমস্যা হয়েছে'
            });
        }
    });

    // PATCH toggle job status
    router.patch('/:id/toggle-status', async (req, res) => {
        try {
            const job = await instituteJobsCollection.findOne({ _id: new ObjectId(req.params.id) });
            
            if (!job) {
                return res.status(404).json({
                    success: false,
                    message: 'জব পাওয়া যায়নি'
                });
            }

            const newStatus = job.status === 'published' ? 'draft' : 'published';
            
            await instituteJobsCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { 
                    $set: { 
                        status: newStatus,
                        updatedAt: new Date()
                    } 
                }
            );

            res.status(200).json({
                success: true,
                message: `জব স্ট্যাটাস ${newStatus === 'published' ? 'প্রকাশিত' : 'খসড়া'} হয়েছে`,
                data: { status: newStatus }
            });
        } catch (error) {
            console.error('Error toggling job status:', error);
            res.status(500).json({
                success: false,
                message: 'স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে'
            });
        }
    });

    return router;
};