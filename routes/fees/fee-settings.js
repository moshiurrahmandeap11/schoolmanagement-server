const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (feeSettingsCollection) => {

    // Get fee settings
    router.get('/', async (req, res) => {
        try {
            const settings = await feeSettingsCollection.findOne({});
            
            if (!settings) {
                // Return default settings if none exist
                const defaultSettings = {
                    incomeSourceId: '',
                    incomeSourceName: '',
                    accountId: '',
                    accountName: '',
                    paymentTypeId: '',
                    paymentTypeName: '',
                    sendMessage: false,
                    feeSms: '',
                    lateFeeSms: '',
                    sendLateFeeSms: false,
                    monthlyFeeStartFrom: '',
                    monthlyFeeEnd: '',
                    boardingFeeStartFrom: '',
                    boardingFeeEnd: '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                return res.status(200).json({
                    success: true,
                    message: 'Default fee settings fetched',
                    data: defaultSettings
                });
            }

            res.status(200).json({
                success: true,
                message: 'Fee settings fetched successfully',
                data: settings
            });
        } catch (error) {
            console.error('Error fetching fee settings:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch fee settings',
                error: error.message
            });
        }
    });

    // Create or update fee settings
    router.post('/fee-settings', async (req, res) => {
        try {
            const { 
                incomeSourceId,
                incomeSourceName,
                accountId,
                accountName,
                paymentTypeId,
                paymentTypeName,
                sendMessage,
                feeSms,
                lateFeeSms,
                sendLateFeeSms,
                monthlyFeeStartFrom,
                monthlyFeeEnd,
                boardingFeeStartFrom,
                boardingFeeEnd
            } = req.body;

            // Validation
            if (!incomeSourceId) {
                return res.status(400).json({
                    success: false,
                    message: 'আয়ের উৎস নির্বাচন করুন'
                });
            }

            if (!accountId) {
                return res.status(400).json({
                    success: false,
                    message: 'অ্যাকাউন্ট নির্বাচন করুন'
                });
            }

            if (!paymentTypeId) {
                return res.status(400).json({
                    success: false,
                    message: 'পেমেন্ট টাইপ নির্বাচন করুন'
                });
            }

            if (sendMessage && !feeSms) {
                return res.status(400).json({
                    success: false,
                    message: 'ফি এসএমএস টেমপ্লেট লিখুন'
                });
            }

            if (sendLateFeeSms && !lateFeeSms) {
                return res.status(400).json({
                    success: false,
                    message: 'লেট ফি এসএমএস টেমপ্লেট লিখুন'
                });
            }

            if (!monthlyFeeStartFrom) {
                return res.status(400).json({
                    success: false,
                    message: 'মাসিক ফি শুরুর তারিখ নির্বাচন করুন'
                });
            }

            if (!monthlyFeeEnd) {
                return res.status(400).json({
                    success: false,
                    message: 'মাসিক ফি শেষের তারিখ নির্বাচন করুন'
                });
            }

            if (monthlyFeeEnd && new Date(monthlyFeeEnd) <= new Date(monthlyFeeStartFrom)) {
                return res.status(400).json({
                    success: false,
                    message: 'মাসিক ফি শেষের তারিখ শুরুর তারিখের পরে হতে হবে'
                });
            }

            if (!boardingFeeStartFrom) {
                return res.status(400).json({
                    success: false,
                    message: 'বোর্ডিং ফি শুরুর তারিখ নির্বাচন করুন'
                });
            }

            if (!boardingFeeEnd) {
                return res.status(400).json({
                    success: false,
                    message: 'বোর্ডিং ফি শেষের তারিখ নির্বাচন করুন'
                });
            }

            if (boardingFeeEnd && new Date(boardingFeeEnd) <= new Date(boardingFeeStartFrom)) {
                return res.status(400).json({
                    success: false,
                    message: 'বোর্ডিং ফি শেষের তারিখ শুরুর তারিখের পরে হতে হবে'
                });
            }

            // Check if settings already exist
            const existingSettings = await feeSettingsCollection.findOne({});

            const settingsData = {
                incomeSourceId: incomeSourceId,
                incomeSourceName: incomeSourceName || '',
                accountId: accountId,
                accountName: accountName || '',
                paymentTypeId: paymentTypeId,
                paymentTypeName: paymentTypeName || '',
                sendMessage: sendMessage || false,
                feeSms: feeSms || '',
                lateFeeSms: lateFeeSms || '',
                sendLateFeeSms: sendLateFeeSms || false,
                monthlyFeeStartFrom: new Date(monthlyFeeStartFrom),
                monthlyFeeEnd: new Date(monthlyFeeEnd),
                boardingFeeStartFrom: new Date(boardingFeeStartFrom),
                boardingFeeEnd: new Date(boardingFeeEnd),
                updatedAt: new Date()
            };

            let result;
            let message;

            if (existingSettings) {
                // Update existing settings
                result = await feeSettingsCollection.updateOne(
                    { _id: existingSettings._id },
                    { $set: settingsData }
                );
                message = 'ফি সেটিংস সফলভাবে আপডেট হয়েছে';
            } else {
                // Create new settings
                settingsData.createdAt = new Date();
                result = await feeSettingsCollection.insertOne(settingsData);
                message = 'ফি সেটিংস সফলভাবে তৈরি হয়েছে';
            }

            res.status(200).json({
                success: true,
                message: message,
                data: settingsData
            });
        } catch (error) {
            console.error('Error saving fee settings:', error);
            res.status(500).json({
                success: false,
                message: 'ফি সেটিংস সংরক্ষণ করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // Update specific fee settings
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { 
                incomeSourceId,
                incomeSourceName,
                accountId,
                accountName,
                paymentTypeId,
                paymentTypeName,
                sendMessage,
                feeSms,
                lateFeeSms,
                sendLateFeeSms,
                monthlyFeeStartFrom,
                monthlyFeeEnd,
                boardingFeeStartFrom,
                boardingFeeEnd
            } = req.body;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid settings ID'
                });
            }

            // Validation (same as POST)
            if (!incomeSourceId) {
                return res.status(400).json({
                    success: false,
                    message: 'আয়ের উৎস নির্বাচন করুন'
                });
            }

            if (!accountId) {
                return res.status(400).json({
                    success: false,
                    message: 'অ্যাকাউন্ট নির্বাচন করুন'
                });
            }

            if (!paymentTypeId) {
                return res.status(400).json({
                    success: false,
                    message: 'পেমেন্ট টাইপ নির্বাচন করুন'
                });
            }

            if (sendMessage && !feeSms) {
                return res.status(400).json({
                    success: false,
                    message: 'ফি এসএমএস টেমপ্লেট লিখুন'
                });
            }

            if (sendLateFeeSms && !lateFeeSms) {
                return res.status(400).json({
                    success: false,
                    message: 'লেট ফি এসএমএস টেমপ্লেট লিখুন'
                });
            }

            if (!monthlyFeeStartFrom) {
                return res.status(400).json({
                    success: false,
                    message: 'মাসিক ফি শুরুর তারিখ নির্বাচন করুন'
                });
            }

            if (!monthlyFeeEnd) {
                return res.status(400).json({
                    success: false,
                    message: 'মাসিক ফি শেষের তারিখ নির্বাচন করুন'
                });
            }

            if (monthlyFeeEnd && new Date(monthlyFeeEnd) <= new Date(monthlyFeeStartFrom)) {
                return res.status(400).json({
                    success: false,
                    message: 'মাসিক ফি শেষের তারিখ শুরুর তারিখের পরে হতে হবে'
                });
            }

            if (!boardingFeeStartFrom) {
                return res.status(400).json({
                    success: false,
                    message: 'বোর্ডিং ফি শুরুর তারিখ নির্বাচন করুন'
                });
            }

            if (!boardingFeeEnd) {
                return res.status(400).json({
                    success: false,
                    message: 'বোর্ডিং ফি শেষের তারিখ নির্বাচন করুন'
                });
            }

            if (boardingFeeEnd && new Date(boardingFeeEnd) <= new Date(boardingFeeStartFrom)) {
                return res.status(400).json({
                    success: false,
                    message: 'বোর্ডিং ফি শেষের তারিখ শুরুর তারিখের পরে হতে হবে'
                });
            }

            // Check if settings exist
            const existingSettings = await feeSettingsCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingSettings) {
                return res.status(404).json({
                    success: false,
                    message: 'ফি সেটিংস পাওয়া যায়নি'
                });
            }

            const updatedSettings = {
                incomeSourceId: incomeSourceId,
                incomeSourceName: incomeSourceName || '',
                accountId: accountId,
                accountName: accountName || '',
                paymentTypeId: paymentTypeId,
                paymentTypeName: paymentTypeName || '',
                sendMessage: sendMessage || false,
                feeSms: feeSms || '',
                lateFeeSms: lateFeeSms || '',
                sendLateFeeSms: sendLateFeeSms || false,
                monthlyFeeStartFrom: new Date(monthlyFeeStartFrom),
                monthlyFeeEnd: new Date(monthlyFeeEnd),
                boardingFeeStartFrom: new Date(boardingFeeStartFrom),
                boardingFeeEnd: new Date(boardingFeeEnd),
                updatedAt: new Date()
            };

            const result = await feeSettingsCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedSettings }
            );

            if (result.modifiedCount === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'ফি সেটিংসে কোন পরিবর্তন করা হয়নি'
                });
            }

            res.status(200).json({
                success: true,
                message: 'ফি সেটিংস সফলভাবে আপডেট হয়েছে',
                data: {
                    _id: id,
                    ...updatedSettings,
                    createdAt: existingSettings.createdAt
                }
            });
        } catch (error) {
            console.error('Error updating fee settings:', error);
            res.status(500).json({
                success: false,
                message: 'ফি সেটিংস আপডেট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    return router;
};