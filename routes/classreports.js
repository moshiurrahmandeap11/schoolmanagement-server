const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

module.exports = (classReportCollection) => {

    // GET all class reports
    router.get('/', async (req, res) => {
        try {
            const { classId, studentId, studentName, subjectId } = req.query;
            
            let filter = {};
            
            if (classId) {
                filter.classId = classId;
            }
            
            if (studentId) {
                filter.studentId = { $regex: studentId, $options: 'i' };
            }
            
            if (studentName) {
                filter.studentName = { $regex: studentName, $options: 'i' };
            }

            if (subjectId) {
                filter.subjectId = subjectId;
            }

            const reports = await classReportCollection.find(filter).sort({ createdAt: -1 }).toArray();

            res.json({
                success: true,
                data: reports,
                message: 'Class reports fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching class reports:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching class reports',
                error: error.message
            });
        }
    });

    // CREATE single class report
    router.post('/', async (req, res) => {
        try {
            const reportData = req.body;

            // Validate required fields
            if (!reportData.studentId || !reportData.classId) {
                return res.status(400).json({
                    success: false,
                    message: 'Student ID and class ID are required'
                });
            }

            const newReport = {
                studentId: reportData.studentId,
                studentName: reportData.studentName,
                classId: reportData.classId,
                className: reportData.className,
                teacherId: reportData.teacherId || '',
                teacherName: reportData.teacherName || '',
                subjectId: reportData.subjectId || '',
                subjectName: reportData.subjectName || '',
                note: reportData.note || '',
                diaryCompleted: reportData.diaryCompleted || false,
                parentSignature: reportData.parentSignature || false,
                learnedStatus: reportData.learnedStatus || '',
                handwritingStatus: reportData.handwritingStatus || '',
                materialsStatus: reportData.materialsStatus || '',
                date: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await classReportCollection.insertOne(newReport);
            
            res.status(201).json({
                success: true,
                message: 'Class report created successfully',
                data: {
                    _id: result.insertedId,
                    ...newReport
                }
            });
        } catch (error) {
            console.error('Error creating class report:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating class report',
                error: error.message
            });
        }
    });

    // BULK CREATE class reports
    router.post('/bulk', async (req, res) => {
        try {
            const { reports } = req.body;

            if (!reports || !Array.isArray(reports)) {
                return res.status(400).json({
                    success: false,
                    message: 'Reports data is required and must be an array'
                });
            }

            // Validate each report
            for (const report of reports) {
                if (!report.studentId || !report.classId) {
                    return res.status(400).json({
                        success: false,
                        message: 'Student ID and class ID are required for all reports'
                    });
                }
            }

            const reportsToInsert = reports.map(report => ({
                studentId: report.studentId,
                studentName: report.studentName,
                classId: report.classId,
                className: report.className,
                teacherId: report.teacherId || '',
                teacherName: report.teacherName || '',
                subjectId: report.subjectId || '',
                subjectName: report.subjectName || '',
                note: report.note || '',
                diaryCompleted: report.diaryCompleted || false,
                parentSignature: report.parentSignature || false,
                learnedStatus: report.learnedStatus || '',
                handwritingStatus: report.handwritingStatus || '',
                materialsStatus: report.materialsStatus || '',
                date: new Date(report.date || new Date()),
                createdAt: new Date(),
                updatedAt: new Date()
            }));

            const result = await classReportCollection.insertMany(reportsToInsert);
            
            res.status(201).json({
                success: true,
                message: `${reports.length} class reports created successfully`,
                data: {
                    insertedCount: result.insertedCount,
                    insertedIds: result.insertedIds
                }
            });
        } catch (error) {
            console.error('Error creating bulk class reports:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating class reports',
                error: error.message
            });
        }
    });

    // GENERATE Excel Report
    router.get('/export/excel', async (req, res) => {
        try {
            const { classId, startDate, endDate } = req.query;

            let filter = {};
            
            if (classId) {
                filter.classId = classId;
            }
            
            if (startDate && endDate) {
                filter.date = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }

            const reports = await classReportCollection.find(filter).toArray();

            // Create Excel workbook
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Class Report');

            // Add headers
            worksheet.columns = [
                { header: 'Student ID', key: 'studentId', width: 15 },
                { header: 'Student Name', key: 'studentName', width: 20 },
                { header: 'Class', key: 'className', width: 15 },
                { header: 'Teacher', key: 'teacherName', width: 20 },
                { header: 'Subject', key: 'subjectName', width: 20 },
                { header: 'Date', key: 'date', width: 15 },
                { header: 'Note', key: 'note', width: 20 },
                { header: 'Diary Completed', key: 'diaryCompleted', width: 15 },
                { header: 'Parent Signature', key: 'parentSignature', width: 15 },
                { header: 'Learned Status', key: 'learnedStatus', width: 15 },
                { header: 'Handwriting', key: 'handwritingStatus', width: 15 },
                { header: 'Materials', key: 'materialsStatus', width: 15 }
            ];

            // Add data
            reports.forEach(report => {
                worksheet.addRow({
                    studentId: report.studentId,
                    studentName: report.studentName,
                    className: report.className,
                    teacherName: report.teacherName,
                    subjectName: report.subjectName,
                    date: report.date.toISOString().split('T')[0],
                    note: report.note,
                    diaryCompleted: report.diaryCompleted ? 'Yes' : 'No',
                    parentSignature: report.parentSignature ? 'Yes' : 'No',
                    learnedStatus: report.learnedStatus,
                    handwritingStatus: report.handwritingStatus,
                    materialsStatus: report.materialsStatus
                });
            });

            // Style headers
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE6E6FA' }
            };

            // Set response headers
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=class-report.xlsx');

            // Write to response
            await workbook.xlsx.write(res);
            res.end();

        } catch (error) {
            console.error('Error generating Excel report:', error);
            res.status(500).json({
                success: false,
                message: 'Error generating Excel report',
                error: error.message
            });
        }
    });

    // GENERATE PDF Report
    router.get('/export/pdf', async (req, res) => {
        try {
            const { classId, startDate, endDate } = req.query;

            let filter = {};
            
            if (classId) {
                filter.classId = classId;
            }
            
            if (startDate && endDate) {
                filter.date = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }

            const reports = await classReportCollection.find(filter).toArray();

            // Create PDF document
            const doc = new PDFDocument();
            
            // Set response headers
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=class-report.pdf');

            doc.pipe(res);

            // Add title
            doc.fontSize(20).text('Class Report', { align: 'center' });
            doc.moveDown();

            // Add date range if provided
            if (startDate && endDate) {
                doc.fontSize(12).text(`Date Range: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`, { align: 'center' });
                doc.moveDown();
            }

            // Add table headers
            const tableTop = doc.y;
            const headers = ['Student', 'Class', 'Teacher', 'Subject', 'Date', 'Diary', 'Parent', 'Learned'];
            const columnWidth = 70;

            doc.fontSize(10);
            headers.forEach((header, i) => {
                doc.text(header, 50 + i * columnWidth, tableTop, { width: columnWidth, align: 'center' });
            });

            // Add horizontal line
            doc.moveTo(50, tableTop + 15).lineTo(50 + headers.length * columnWidth, tableTop + 15).stroke();

            // Add data rows
            let yPosition = tableTop + 25;

            reports.forEach((report, index) => {
                if (yPosition > 700) { // New page if needed
                    doc.addPage();
                    yPosition = 50;
                }

                const rowData = [
                    report.studentName,
                    report.className,
                    report.teacherName,
                    report.subjectName,
                    report.date.toISOString().split('T')[0],
                    report.diaryCompleted ? '✓' : '✗',
                    report.parentSignature ? '✓' : '✗',
                    report.learnedStatus
                ];

                rowData.forEach((data, i) => {
                    doc.text(data, 50 + i * columnWidth, yPosition, { width: columnWidth, align: 'center' });
                });

                yPosition += 20;
            });

            doc.end();

        } catch (error) {
            console.error('Error generating PDF report:', error);
            res.status(500).json({
                success: false,
                message: 'Error generating PDF report',
                error: error.message
            });
        }
    });

    // DELETE single class report
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid report ID'
            });
        }

        const result = await classReportCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Class report not found'
            });
        }

        res.json({
            success: true,
            message: 'Class report deleted successfully',
            deletedId: id
        });

    } catch (error) {
        console.error('Error deleting class report:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting class report',
            error: error.message
        });
    }
});


    return router;
};