const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const upload = require('../../middleware/upload');

module.exports = (excelMarksCollection) => {
    
    // Get filter options for dropdowns
    router.get('/filters', async (req, res) => {
        try {
            // Get unique exam categories from excelMarksCollection
            const allData = await excelMarksCollection.find({}).toArray();
            const examCategories = [...new Set(allData.map(item => item.examCategory))].filter(Boolean);
            
            res.json({
                success: true,
                examCategories
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching filter options',
                error: error.message
            });
        }
    });

    // Create and save excel marks data
    router.post('/', async (req, res) => {
        try {
            const { 
                examCategory, 
                averageMarks, 
                averageLetterGrade, 
                order, 
                totalAbsent, 
                totalPresent,
                excelFile 
            } = req.body;
            
            // Validation
            if (!examCategory) {
                return res.status(400).json({
                    success: false,
                    message: 'Exam category is required'
                });
            }
            
            const newExcelMark = {
                examCategory,
                averageMarks: averageMarks || 0,
                averageLetterGrade: averageLetterGrade || 'N/A',
                order: order || 0,
                totalAbsent: totalAbsent || 0,
                totalPresent: totalPresent || 0,
                excelFile: excelFile || '',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            // Save to database
            const result = await excelMarksCollection.insertOne(newExcelMark);
            
            res.json({
                success: true,
                message: 'Excel marks data saved successfully',
                data: {
                    id: result.insertedId,
                    ...newExcelMark
                }
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error saving excel marks data',
                error: error.message
            });
        }
    });

    // Download Excel template
    router.get('/download-template', async (req, res) => {
        try {
            const { examCategory } = req.query;
            
            if (!examCategory) {
                return res.status(400).json({
                    success: false,
                    message: 'Exam category is required'
                });
            }

            // Create Excel workbook
            const workbook = XLSX.utils.book_new();
            
            // Create worksheet with headers only (no dummy data)
            const worksheetData = [
                ['Student ID', 'Student Name', 'Roll Number', 'Marks', 'Grade', 'Comments']
            ];
            
            const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Marks Sheet');
            
            // Set column widths
            const colWidths = [
                { wch: 12 }, // Student ID
                { wch: 20 }, // Student Name
                { wch: 12 }, // Roll Number
                { wch: 10 }, // Marks
                { wch: 8 },  // Grade
                { wch: 25 }  // Comments
            ];
            worksheet['!cols'] = colWidths;
            
            // Generate buffer
            const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
            
            // Set headers for download
            const filename = `marks_template_${examCategory}_${Date.now()}.xlsx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            
            // Send file
            res.send(excelBuffer);
            
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error generating Excel template',
                error: error.message
            });
        }
    });

    // Upload and process Excel file
    router.post('/upload', upload.single('excelFile'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            const { examCategory } = req.body;
            
            if (!examCategory) {
                // Delete uploaded file if validation fails
                fs.unlinkSync(req.file.path);
                return res.status(400).json({
                    success: false,
                    message: 'Exam category is required'
                });
            }

            // Read and process Excel file
            const workbook = XLSX.readFile(req.file.path);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            // Save file info to database
            const excelMarkData = {
                examCategory,
                excelFile: {
                    filename: req.file.filename,
                    originalName: req.file.originalname,
                    path: req.file.path,
                    size: req.file.size,
                    uploadedAt: new Date()
                },
                totalRecords: jsonData.length,
                processedData: jsonData,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await excelMarksCollection.insertOne(excelMarkData);

            res.json({
                success: true,
                message: 'Excel file uploaded and processed successfully',
                data: {
                    id: result.insertedId,
                    totalRecords: jsonData.length,
                    filename: req.file.filename
                }
            });

        } catch (error) {
            // Delete uploaded file if error occurs
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            res.status(500).json({
                success: false,
                message: 'Error processing Excel file',
                error: error.message
            });
        }
    });

    // Get all excel marks data
    router.get('/', async (req, res) => {
        try {
            const { examCategory } = req.query;
            
            let query = {};
            if (examCategory && examCategory !== 'all') {
                query.examCategory = examCategory;
            }
            
            const excelMarks = await excelMarksCollection.find(query).sort({ createdAt: -1 }).toArray();
            
            res.json({
                success: true,
                data: excelMarks,
                total: excelMarks.length
            });
            
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching excel marks data',
                error: error.message
            });
        }
    });

    return router;
};