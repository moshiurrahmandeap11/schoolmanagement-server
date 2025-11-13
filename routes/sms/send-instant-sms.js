const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const axios = require('axios');

module.exports = (sendsmsCollection) => {
    
    // GET all sent messages
    router.get('/', async (req, res) => {
        try {
            const messages = await sendsmsCollection.find().sort({ sentAt: -1 }).toArray();
            res.json({
                success: true,
                data: messages
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'বার্তা লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // SEND SMS
    router.post('/send-sms', async (req, res) => {
        try {
            const { phoneNumbers, message } = req.body;

            // Validation
            if (!phoneNumbers || phoneNumbers.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'ফোন নম্বর প্রয়োজন'
                });
            }

            if (!message || !message.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'বার্তা প্রয়োজন'
                });
            }

            // Process phone numbers
            const numbersArray = phoneNumbers.split(',').map(num => num.trim()).filter(num => num);
            
            if (numbersArray.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'সঠিক ফোন নম্বর দিন'
                });
            }

            // Validate phone numbers (Bangladeshi format)
            const validNumbers = [];
            const invalidNumbers = [];

            numbersArray.forEach(number => {
                // Bangladeshi phone number validation (11 digits, starts with 01)
                if (/^01[3-9]\d{8}$/.test(number)) {
                    validNumbers.push(number);
                } else {
                    invalidNumbers.push(number);
                }
            });

            if (validNumbers.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'কোন সঠিক ফোন নম্বর পাওয়া যায়নি'
                });
            }

            // Actual SMS API integration
            const sendSMSToNumber = async (phoneNumber, smsMessage) => {
                try {
                    const apiKey = '1:559402944554:web:a46ed9c416a5d0efee1b53';
                    const apiUrl = 'https://sms-api.example.com/send'; // Replace with actual SMS provider API URL

                    const payload = {
                        api_key: apiKey,
                        to: phoneNumber,
                        message: smsMessage,
                        sender_id: 'EDUMS', // Your sender ID
                        type: 'text'
                    };

                    // Uncomment below code when you have actual SMS provider
                    /*
                    const response = await axios.post(apiUrl, payload, {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        }
                    });

                    if (response.data.status === 'success') {
                        return {
                            success: true,
                            messageId: response.data.message_id,
                            number: phoneNumber,
                            status: 'sent',
                            providerResponse: response.data
                        };
                    } else {
                        return {
                            success: false,
                            number: phoneNumber,
                            error: response.data.message || 'SMS sending failed',
                            providerResponse: response.data
                        };
                    }
                    */

                    // Temporary mock response until actual SMS provider is configured
                    console.log(`Mock SMS sent to: ${phoneNumber}`);
                    console.log(`Message: ${smsMessage}`);
                    
                    // Simulate API call delay
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Mock successful response
                    return {
                        success: true,
                        messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        number: phoneNumber,
                        status: 'sent',
                        providerResponse: { status: 'success', message: 'SMS sent successfully' }
                    };

                } catch (error) {
                    console.error(`SMS sending error for ${phoneNumber}:`, error);
                    return {
                        success: false,
                        number: phoneNumber,
                        error: error.message,
                        providerResponse: error.response?.data || null
                    };
                }
            };

            // Send SMS to all valid numbers
            const sendResults = [];
            let successfulSends = 0;
            let failedSends = 0;

            // Send SMS in batches to avoid rate limiting
            const batchSize = 10;
            for (let i = 0; i < validNumbers.length; i += batchSize) {
                const batch = validNumbers.slice(i, i + batchSize);
                const batchPromises = batch.map(number => sendSMSToNumber(number, message.trim()));
                
                const batchResults = await Promise.all(batchPromises);
                sendResults.push(...batchResults);

                // Count results
                batchResults.forEach(result => {
                    if (result.success) {
                        successfulSends++;
                    } else {
                        failedSends++;
                    }
                });

                // Add delay between batches to avoid rate limiting
                if (i + batchSize < validNumbers.length) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            // Save to database
            const smsRecord = {
                phoneNumbers: validNumbers,
                invalidNumbers: invalidNumbers,
                message: message.trim(),
                totalNumbers: validNumbers.length,
                successfulSends: successfulSends,
                failedSends: failedSends,
                sendResults: sendResults,
                sentAt: new Date(),
                status: successfulSends > 0 ? 'partial' : 'failed',
                apiKeyUsed: '1:559402944554:web:a46ed9c416a5d0efee1b53'
            };

            if (successfulSends === validNumbers.length) {
                smsRecord.status = 'success';
            }

            const result = await sendsmsCollection.insertOne(smsRecord);

            // Prepare response
            const response = {
                success: true,
                message: 'বার্তা সফলভাবে পাঠানো হয়েছে',
                data: {
                    _id: result.insertedId,
                    totalNumbers: validNumbers.length,
                    successfulSends,
                    failedSends,
                    invalidNumbers,
                    sentAt: smsRecord.sentAt,
                    status: smsRecord.status
                }
            };

            if (invalidNumbers.length > 0) {
                response.warning = `${invalidNumbers.length} টি অবৈধ নম্বর পাওয়া গেছে: ${invalidNumbers.join(', ')}`;
            }

            if (failedSends > 0) {
                response.warning = `${failedSends} টি নম্বরে বার্তা পাঠানো যায়নি`;
            }

            res.json(response);

        } catch (error) {
            console.error('Error sending SMS:', error);
            res.status(500).json({
                success: false,
                message: 'বার্তা পাঠাতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // BULK SMS with template
    router.post('/send-bulk-sms', async (req, res) => {
        try {
            const { phoneNumbers, messageTemplate, variables } = req.body;

            if (!phoneNumbers || !messageTemplate) {
                return res.status(400).json({
                    success: false,
                    message: 'ফোন নম্বর এবং বার্তা টেমপ্লেট প্রয়োজন'
                });
            }

            // Process phone numbers
            const numbersArray = phoneNumbers.split(',').map(num => num.trim()).filter(num => num);
            const validNumbers = numbersArray.filter(number => /^01[3-9]\d{8}$/.test(number));

            if (validNumbers.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'কোন সঠিক ফোন নম্বর পাওয়া যায়নি'
                });
            }

            // Send SMS to all numbers
            const sendResults = [];
            let successfulSends = 0;

            for (const number of validNumbers) {
                // Replace variables in template if provided
                let personalizedMessage = messageTemplate;
                if (variables && variables[number]) {
                    Object.keys(variables[number]).forEach(key => {
                        personalizedMessage = personalizedMessage.replace(`{${key}}`, variables[number][key]);
                    });
                }

                const result = await sendSMSToNumber(number, personalizedMessage);
                sendResults.push(result);
                
                if (result.success) {
                    successfulSends++;
                }
            }

            // Save to database
            const smsRecord = {
                phoneNumbers: validNumbers,
                message: messageTemplate,
                personalizedMessages: sendResults.map(r => ({ number: r.number, message: r.message })),
                totalNumbers: validNumbers.length,
                successfulSends: successfulSends,
                failedSends: validNumbers.length - successfulSends,
                sendResults: sendResults,
                sentAt: new Date(),
                status: successfulSends > 0 ? 'partial' : 'failed',
                type: 'bulk',
                apiKeyUsed: '1:559402944554:web:a46ed9c416a5d0efee1b53'
            };

            if (successfulSends === validNumbers.length) {
                smsRecord.status = 'success';
            }

            await sendsmsCollection.insertOne(smsRecord);

            res.json({
                success: true,
                message: 'বাল্ক বার্তা সফলভাবে পাঠানো হয়েছে',
                data: {
                    totalNumbers: validNumbers.length,
                    successfulSends,
                    failedSends: validNumbers.length - successfulSends
                }
            });

        } catch (error) {
            console.error('Error sending bulk SMS:', error);
            res.status(500).json({
                success: false,
                message: 'বাল্ক বার্তা পাঠাতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // GET SMS statistics
    router.get('/statistics', async (req, res) => {
        try {
            const totalMessages = await sendsmsCollection.countDocuments();
            const successfulMessages = await sendsmsCollection.countDocuments({ status: 'success' });
            const failedMessages = await sendsmsCollection.countDocuments({ status: 'failed' });
            const partialMessages = await sendsmsCollection.countDocuments({ status: 'partial' });

            // Get total numbers sent
            const allMessages = await sendsmsCollection.find().toArray();
            const totalNumbersSent = allMessages.reduce((sum, msg) => sum + msg.totalNumbers, 0);
            const totalSuccessfulSends = allMessages.reduce((sum, msg) => sum + msg.successfulSends, 0);

            // Get today's statistics
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todaysMessages = await sendsmsCollection.countDocuments({ 
                sentAt: { $gte: today } 
            });

            res.json({
                success: true,
                data: {
                    totalMessages,
                    successfulMessages,
                    failedMessages,
                    partialMessages,
                    todaysMessages,
                    totalNumbersSent,
                    totalSuccessfulSends,
                    successRate: totalNumbersSent > 0 ? ((totalSuccessfulSends / totalNumbersSent) * 100).toFixed(2) : 0
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'স্ট্যাটিস্টিক্স লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // GET message details
    router.get('/:id', async (req, res) => {
        try {
            const message = await sendsmsCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!message) {
                return res.status(404).json({
                    success: false,
                    message: 'বার্তা রেকর্ড পাওয়া যায়নি'
                });
            }

            res.json({
                success: true,
                data: message
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'বার্তা ডিটেইলস লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // DELETE SMS record
    router.delete('/:id', async (req, res) => {
        try {
            const message = await sendsmsCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!message) {
                return res.status(404).json({
                    success: false,
                    message: 'বার্তা রেকর্ড পাওয়া যায়নি'
                });
            }

            const result = await sendsmsCollection.deleteOne({ 
                _id: new ObjectId(req.params.id) 
            });

            res.json({
                success: true,
                message: 'বার্তা রেকর্ড সফলভাবে ডিলিট হয়েছে'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'বার্তা রেকর্ড ডিলিট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // Helper function for sending SMS
    async function sendSMSToNumber(phoneNumber, smsMessage) {
        try {
            const apiKey = '1:559402944554:web:a46ed9c416a5d0efee1b53';
            // Replace with your actual SMS provider API endpoint
            const apiUrl = 'https://your-sms-provider.com/api/send';
            
            const payload = {
                api_key: apiKey,
                to: phoneNumber,
                message: smsMessage,
                sender_id: 'EDUMS',
                type: 'text'
            };

            // Uncomment when you have actual SMS provider
            /*
            const response = await axios.post(apiUrl, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                timeout: 10000
            });

            if (response.data.status === 'success' || response.data.error === null) {
                return {
                    success: true,
                    messageId: response.data.message_id || response.data.id,
                    number: phoneNumber,
                    status: 'sent',
                    providerResponse: response.data
                };
            } else {
                return {
                    success: false,
                    number: phoneNumber,
                    error: response.data.message || response.data.error,
                    providerResponse: response.data
                };
            }
            */

            // Mock implementation for now
            console.log(`[MOCK SMS] To: ${phoneNumber}, Message: ${smsMessage.substring(0, 50)}...`);
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Simulate occasional failures
            const shouldFail = Math.random() < 0.1; // 10% failure rate for testing
            if (shouldFail) {
                return {
                    success: false,
                    number: phoneNumber,
                    error: 'Network error - simulated failure',
                    providerResponse: { status: 'failed', error: 'Simulated network error' }
                };
            }

            return {
                success: true,
                messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                number: phoneNumber,
                status: 'sent',
                providerResponse: { 
                    status: 'success', 
                    message: 'SMS sent successfully',
                    id: `msg_${Date.now()}`
                }
            };

        } catch (error) {
            console.error(`SMS sending failed for ${phoneNumber}:`, error.message);
            return {
                success: false,
                number: phoneNumber,
                error: error.message,
                providerResponse: error.response?.data || null
            };
        }
    }

    return router;
};