const express = require('express');
const router = express.Router();
const axios = require('axios');

module.exports = (resultsCollection, studentsCollection) => {
    
    // Send SMS to single student
    router.post('/send-single', async (req, res) => {
        try {
            const { studentId, examCategory, phoneNumber } = req.body;
            
            if (!studentId || !examCategory || !phoneNumber) {
                return res.status(400).json({
                    success: false,
                    message: 'Student ID, exam category and phone number are required'
                });
            }

            // Validate Bangladesh phone number
            const bangladeshPhoneRegex = /^(?:\+88|88)?(01[3-9]\d{8})$/;
            if (!bangladeshPhoneRegex.test(phoneNumber)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid Bangladesh phone number format'
                });
            }

            // Format phone number to +880 format
            let formattedNumber = phoneNumber;
            if (phoneNumber.startsWith('01')) {
                formattedNumber = `88${phoneNumber}`;
            } else if (phoneNumber.startsWith('+88')) {
                formattedNumber = phoneNumber.substring(1);
            }

            // Fetch student result
            const result = await resultsCollection.findOne({
                studentId: studentId,
                examCategory: examCategory
            });

            if (!result) {
                return res.status(404).json({
                    success: false,
                    message: 'Result not found for this student and exam'
                });
            }

            // Fetch student details
            const student = await studentsCollection.findOne({ studentId: studentId });
            if (!student) {
                return res.status(404).json({
                    success: false,
                    message: 'Student not found'
                });
            }

            // Create SMS message
            const smsMessage = `
প্রিয় ${student.name},
পরীক্ষা: ${examCategory}
আপনার প্রাপ্ত নম্বর: ${result.averageMarks}
গ্রেড: ${result.averageLetterGrade}
অবস্থান: ${result.order}
উপস্থিতি: ${result.totalPresent}/${result.totalPresent + result.totalAbsent}
স্কুল ম্যানেজমেন্ট সিস্টেম
            `.trim();

            // Send SMS via SSL Wireless (Example)
            const smsResponse = await sendSMSViaSSLWireless(formattedNumber, smsMessage);

            if (smsResponse.success) {
                // Save SMS log to database
                const smsLog = {
                    studentId: studentId,
                    studentName: student.name,
                    examCategory: examCategory,
                    phoneNumber: formattedNumber,
                    message: smsMessage,
                    status: 'sent',
                    smsId: smsResponse.sms_id,
                    sentAt: new Date(),
                    createdAt: new Date()
                };

                await resultsCollection.updateOne(
                    { _id: result._id },
                    { 
                        $push: { smsLogs: smsLog },
                        $set: { updatedAt: new Date() }
                    }
                );

                res.json({
                    success: true,
                    message: 'SMS sent successfully',
                    data: {
                        studentName: student.name,
                        phoneNumber: formattedNumber,
                        smsId: smsResponse.sms_id,
                        message: smsMessage
                    }
                });
            } else {
                throw new Error(smsResponse.message || 'Failed to send SMS');
            }

        } catch (error) {
            console.error('Error sending SMS:', error);
            res.status(500).json({
                success: false,
                message: 'Error sending SMS',
                error: error.message
            });
        }
    });

    // Send SMS to multiple students
    router.post('/send-bulk', async (req, res) => {
        try {
            const { studentIds, examCategory } = req.body;
            
            if (!studentIds || !examCategory || !Array.isArray(studentIds)) {
                return res.status(400).json({
                    success: false,
                    message: 'Student IDs array and exam category are required'
                });
            }

            const results = [];
            const failedSMS = [];

            for (const studentId of studentIds) {
                try {
                    // Fetch student details
                    const student = await studentsCollection.findOne({ studentId: studentId });
                    if (!student || !student.guardianMobile) {
                        failedSMS.push({
                            studentId: studentId,
                            reason: 'Student not found or no guardian mobile number'
                        });
                        continue;
                    }

                    // Validate phone number
                    const phoneNumber = student.guardianMobile;
                    const bangladeshPhoneRegex = /^(?:\+88|88)?(01[3-9]\d{8})$/;
                    if (!bangladeshPhoneRegex.test(phoneNumber)) {
                        failedSMS.push({
                            studentId: studentId,
                            reason: 'Invalid phone number format'
                        });
                        continue;
                    }

                    // Format phone number
                    let formattedNumber = phoneNumber;
                    if (phoneNumber.startsWith('01')) {
                        formattedNumber = `88${phoneNumber}`;
                    } else if (phoneNumber.startsWith('+88')) {
                        formattedNumber = phoneNumber.substring(1);
                    }

                    // Fetch student result
                    const result = await resultsCollection.findOne({
                        studentId: studentId,
                        examCategory: examCategory
                    });

                    if (!result) {
                        failedSMS.push({
                            studentId: studentId,
                            reason: 'Result not found for this exam'
                        });
                        continue;
                    }

                    // Create SMS message
                    const smsMessage = `
প্রিয় অভিভাবক,
ছাত্র/ছাত্রী: ${student.name}
পরীক্ষা: ${examCategory}
প্রাপ্ত নম্বর: ${result.averageMarks}
গ্রেড: ${result.averageLetterGrade}
অবস্থান: ${result.order}
উপস্থিতি: ${result.totalPresent}/${result.totalPresent + result.totalAbsent}
স্কুল ম্যানেজমেন্ট সিস্টেম
                    `.trim();

                    // Send SMS
                    const smsResponse = await sendSMSViaSSLWireless(formattedNumber, smsMessage);

                    if (smsResponse.success) {
                        // Save SMS log
                        const smsLog = {
                            studentId: studentId,
                            studentName: student.name,
                            examCategory: examCategory,
                            phoneNumber: formattedNumber,
                            message: smsMessage,
                            status: 'sent',
                            smsId: smsResponse.sms_id,
                            sentAt: new Date(),
                            createdAt: new Date()
                        };

                        await resultsCollection.updateOne(
                            { _id: result._id },
                            { 
                                $push: { smsLogs: smsLog },
                                $set: { updatedAt: new Date() }
                            }
                        );

                        results.push({
                            studentId: studentId,
                            studentName: student.name,
                            phoneNumber: formattedNumber,
                            status: 'sent',
                            smsId: smsResponse.sms_id
                        });
                    } else {
                        failedSMS.push({
                            studentId: studentId,
                            reason: smsResponse.message || 'SMS sending failed'
                        });
                    }

                } catch (error) {
                    failedSMS.push({
                        studentId: studentId,
                        reason: error.message
                    });
                }
            }

            res.json({
                success: true,
                message: `SMS sending completed. Success: ${results.length}, Failed: ${failedSMS.length}`,
                data: {
                    successful: results,
                    failed: failedSMS
                }
            });

        } catch (error) {
            console.error('Error sending bulk SMS:', error);
            res.status(500).json({
                success: false,
                message: 'Error sending bulk SMS',
                error: error.message
            });
        }
    });

    // Get SMS sending history
    router.get('/history/:studentId', async (req, res) => {
        try {
            const { studentId } = req.params;
            
            const results = await resultsCollection.find({ 
                studentId: studentId,
                smsLogs: { $exists: true, $ne: [] }
            }).toArray();

            const smsHistory = results.flatMap(result => 
                result.smsLogs.map(log => ({
                    ...log,
                    examCategory: result.examCategory
                }))
            ).sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

            res.json({
                success: true,
                data: smsHistory,
                total: smsHistory.length
            });

        } catch (error) {
            console.error('Error fetching SMS history:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching SMS history',
                error: error.message
            });
        }
    });

    return router;
};

// SSL Wireless SMS sending function
async function sendSMSViaSSLWireless(phoneNumber, message) {
    try {
        const apiKey = process.env.SSL_WIRELESS_API_KEY;
        const sid = process.env.SSL_WIRELESS_SID;
        const apiUrl = 'https://sms.sslwireless.com/api/v3/send-sms';

        const response = await axios.post(apiUrl, {
            api_token: apiKey,
            sid: sid,
            msisdn: phoneNumber,
            sms: message,
            csms_id: `SCHOOL_${Date.now()}`
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        return {
            success: true,
            sms_id: response.data.sms_info_id,
            message: 'SMS sent successfully'
        };

    } catch (error) {
        console.error('SSL Wireless API Error:', error.response?.data || error.message);
        return {
            success: false,
            message: error.response?.data?.message || error.message
        };
    }
}

// Alternative: Bulk SMS Bangladesh function
async function sendSMSViaBulkSMSBD(phoneNumber, message) {
    try {
        const apiKey = process.env.BULK_SMS_BD_API_KEY;
        const apiUrl = 'http://66.45.237.70/api.php';

        const response = await axios.get(apiUrl, {
            params: {
                username: 'your_username',
                password: 'your_password',
                number: phoneNumber,
                message: message
            }
        });

        if (response.data.includes('1001')) {
            return {
                success: true,
                message: 'SMS sent successfully'
            };
        } else {
            return {
                success: false,
                message: 'Failed to send SMS'
            };
        }

    } catch (error) {
        console.error('Bulk SMS BD Error:', error);
        return {
            success: false,
            message: error.message
        };
    }
}