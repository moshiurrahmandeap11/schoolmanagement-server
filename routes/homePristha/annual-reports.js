const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const upload = require('../../middleware/upload');

module.exports = (annualReportsCollection) => {

    // GET all annual reports
    router.get('/', async (req, res) => {
        try {
            const annualReports = await annualReportsCollection.find({}).sort({ year: -1, createdAt: -1 }).toArray();
            
            res.json({
                success: true,
                data: annualReports,
                total: annualReports.length,
                message: 'Annual reports fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching annual reports:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching annual reports',
                error: error.message
            });
        }
    });

    // GET single annual report by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid annual report ID'
                });
            }

            const annualReport = await annualReportsCollection.findOne({ _id: new ObjectId(id) });
            
            if (!annualReport) {
                return res.status(404).json({
                    success: false,
                    message: 'Annual report not found'
                });
            }

            res.json({
                success: true,
                data: annualReport,
                message: 'Annual report fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching annual report:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching annual report',
                error: error.message
            });
        }
    });

    // CREATE new annual report with file upload
    router.post('/', upload.single('reportFile'), async (req, res) => {
        try {
            const { title, description, year } = req.body;

            // Validation
            if (!title || !title.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'শিরোনাম প্রয়োজন'
                });
            }

            if (!description || !description.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'বিবরণ প্রয়োজন'
                });
            }

            if (!year) {
                return res.status(400).json({
                    success: false,
                    message: 'বছর প্রয়োজন'
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'রিপোর্ট ফাইল (PDF) প্রয়োজন'
                });
            }

            // Check if report already exists for this year
            const existingReport = await annualReportsCollection.findOne({ 
                year: year.trim()
            });

            if (existingReport) {
                return res.status(400).json({
                    success: false,
                    message: 'এই বছরের জন্য ইতিমধ্যেই একটি বার্ষিক রিপোর্ট আছে'
                });
            }

            const newAnnualReport = {
                title: title.trim(),
                description: description.trim(),
                year: year.trim(),
                reportFile: `/api/uploads/${req.file.filename}`,
                fileName: req.file.originalname,
                fileSize: req.file.size,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await annualReportsCollection.insertOne(newAnnualReport);
            
            res.status(201).json({
                success: true,
                message: 'বার্ষিক রিপোর্ট সফলভাবে তৈরি হয়েছে',
                data: {
                    _id: result.insertedId,
                    ...newAnnualReport
                }
            });
        } catch (error) {
            console.error('Error creating annual report:', error);
            res.status(500).json({
                success: false,
                message: 'বার্ষিক রিপোর্ট তৈরি করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // UPDATE annual report
    router.put('/:id', upload.single('reportFile'), async (req, res) => {
        try {
            const { id } = req.params;
            const { title, description, year, isActive } = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid annual report ID'
                });
            }

            // Check if annual report exists
            const existingReport = await annualReportsCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingReport) {
                return res.status(404).json({
                    success: false,
                    message: 'Annual report not found'
                });
            }

            // Check if year already exists (excluding current report)
            if (year && year !== existingReport.year) {
                const duplicateReport = await annualReportsCollection.findOne({ 
                    year: year.trim(),
                    _id: { $ne: new ObjectId(id) }
                });

                if (duplicateReport) {
                    return res.status(400).json({
                        success: false,
                        message: 'এই বছরের জন্য ইতিমধ্যেই একটি বার্ষিক রিপোর্ট আছে'
                    });
                }
            }

            const updateData = {
                updatedAt: new Date()
            };

            if (title !== undefined) updateData.title = title.trim();
            if (description !== undefined) updateData.description = description.trim();
            if (year !== undefined) updateData.year = year.trim();
            if (isActive !== undefined) updateData.isActive = Boolean(isActive);
            
            // Handle file upload
            if (req.file) {
                updateData.reportFile = `/api/uploads/${req.file.filename}`;
                updateData.fileName = req.file.originalname;
                updateData.fileSize = req.file.size;
            }

            const result = await annualReportsCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            res.json({
                success: true,
                message: 'বার্ষিক রিপোর্ট সফলভাবে আপডেট হয়েছে',
                data: {
                    _id: id,
                    ...updateData
                }
            });
        } catch (error) {
            console.error('Error updating annual report:', error);
            res.status(500).json({
                success: false,
                message: 'বার্ষিক রিপোর্ট আপডেট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // DELETE annual report
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid annual report ID'
                });
            }

            const result = await annualReportsCollection.deleteOne({ 
                _id: new ObjectId(id) 
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Annual report not found'
                });
            }

            res.json({
                success: true,
                message: 'বার্ষিক রিপোর্ট সফলভাবে ডিলিট হয়েছে'
            });
        } catch (error) {
            console.error('Error deleting annual report:', error);
            res.status(500).json({
                success: false,
                message: 'বার্ষিক রিপোর্ট ডিলিট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // TOGGLE annual report status
    router.patch('/:id/toggle-status', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid annual report ID'
                });
            }

            const annualReport = await annualReportsCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!annualReport) {
                return res.status(404).json({
                    success: false,
                    message: 'Annual report not found'
                });
            }

            const newStatus = !annualReport.isActive;

            await annualReportsCollection.updateOne(
                { _id: new ObjectId(id) },
                { 
                    $set: { 
                        isActive: newStatus,
                        updatedAt: new Date() 
                    } 
                }
            );

            res.json({
                success: true,
                message: `বার্ষিক রিপোর্ট ${newStatus ? 'সক্রিয়' : 'নিষ্ক্রিয়'} হয়েছে`,
                data: {
                    isActive: newStatus
                }
            });
        } catch (error) {
            console.error('Error toggling annual report status:', error);
            res.status(500).json({
                success: false,
                message: 'স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // GET annual reports by year range
    router.get('/years/range', async (req, res) => {
        try {
            const { startYear, endYear } = req.query;
            
            let filter = {};
            
            if (startYear && endYear) {
                filter.year = {
                    $gte: startYear,
                    $lte: endYear
                };
            }

            const annualReports = await annualReportsCollection.find(filter).sort({ year: -1 }).toArray();

            res.json({
                success: true,
                data: annualReports,
                total: annualReports.length,
                message: 'Annual reports fetched successfully by year range'
            });
        } catch (error) {
            console.error('Error fetching annual reports by year range:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching annual reports by year range',
                error: error.message
            });
        }
    });

    return router;
};