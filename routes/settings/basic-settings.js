const express = require('express');
const router = express.Router();

module.exports = (basicSettingsCollection) => {
    
    // GET basic settings
    router.get('/', async (req, res) => {
        try {
            // Since there's only one settings document, we'll get the first one
            const settings = await basicSettingsCollection.findOne({});
            
            if (!settings) {
                // Return default settings if no settings found
                const defaultSettings = {
                    language: 'bangla',
                    studentIdFormat: '',
                    studentOrderBy: 'name',
                    resultType: 'grade',
                    failCountBySubjectNumber: 1,
                    showRankingOnTabularResult: false,
                    showRankingOnMarksheet: false,
                    showCtNumber: false,
                    countOptionalSubjectForGpa: false,
                    showAttendanceOnResult: false,
                    invoiceStartNumber: 1,
                    voucherStartNumber: 1,
                    showFeeOnStudentPage: false,
                    showFeeAllocationOnStudentPage: false,
                    showInstituteWithBranch: false,
                    marksheetContentInEnglish: false,
                    generateFullYearFee: false,
                    showInvoiceNumberField: false,
                    showCollectorField: false,
                    showSeatNumberInAdmitCard: false,
                    hideFinanceForNonAdmin: false,
                    secondTimePunch: 30,
                    attendanceType: 'both',
                    showAddressDetails: false,
                    showBatchAndSection: false,
                    showCollectFeeListView: false,
                    showExpenseCategoryListInExpense: false,
                    showDekhalaNumber: false,
                    showSubtotalWithExpenseItem: false,
                    manageExpenseWithCategory: false,
                    showIdCardPrint: false,
                    guardianWillPayOnlinePaymentCharge: false,
                    hideTeacherNumber: false,
                    updatedAt: new Date()
                };
                
                return res.json({
                    success: true,
                    data: defaultSettings
                });
            }
            
            res.json({
                success: true,
                data: settings
            });
        } catch (error) {
            console.error('Error fetching basic settings:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    });

    // POST/UPDATE basic settings
    router.post('/', async (req, res) => {
        try {
            const settingsData = {
                ...req.body,
                updatedAt: new Date()
            };

            // Check if settings already exist
            const existingSettings = await basicSettingsCollection.findOne({});
            
            let result;
            if (existingSettings) {
                // Update existing settings
                result = await basicSettingsCollection.updateOne(
                    { _id: existingSettings._id },
                    { $set: settingsData }
                );
            } else {
                // Insert new settings
                settingsData.createdAt = new Date();
                result = await basicSettingsCollection.insertOne(settingsData);
            }

            if (result.acknowledged) {
                res.json({
                    success: true,
                    message: 'Settings saved successfully'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to save settings'
                });
            }
        } catch (error) {
            console.error('Error saving basic settings:', error);
            res.status(500).json({
                success: false,
                message: 'Server error'
            });
        }
    });

    return router;
};