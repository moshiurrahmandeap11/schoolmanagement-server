const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (smsBalanceCollection, smsPurchaseCollection) => {
    
    // GET current SMS balance
    router.get('/balance', async (req, res) => {
        try {
            // Get current balance or create if not exists
            let balance = await smsBalanceCollection.findOne({ type: 'current' });
            
            if (!balance) {
                // Initialize with default balance
                const initialBalance = {
                    type: 'current',
                    totalSMS: 0,
                    usedSMS: 0,
                    remainingSMS: 0,
                    lastUpdated: new Date(),
                    createdAt: new Date()
                };
                const result = await smsBalanceCollection.insertOne(initialBalance);
                balance = { _id: result.insertedId, ...initialBalance };
            }

            res.json({
                success: true,
                data: balance
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'এসএমএস ব্যালেন্স লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // GET SMS purchase history
    router.get('/purchase-history', async (req, res) => {
        try {
            const purchases = await smsPurchaseCollection.find().sort({ purchaseDate: -1 }).toArray();
            res.json({
                success: true,
                data: purchases
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ক্রয় ইতিহাস লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // GET SMS pricing
    router.get('/pricing', async (req, res) => {
        try {
            const pricing = {
                pricePerSMS: 0.40, // ৳0.40 per SMS
                currency: 'BDT',
                onlineChargePercent: 2.5,
                minPurchase: 10,
                maxPurchase: 10000
            };

            res.json({
                success: true,
                data: pricing
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'মূল্য লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // CREATE SMS purchase request
    router.post('/purchase', async (req, res) => {
        try {
            const { amount, paymentMethod, transactionId, phoneNumber } = req.body;

            // Validation
            if (!amount || amount < 10) {
                return res.status(400).json({
                    success: false,
                    message: 'ন্যূনতম ১০ টি এসএমএস ক্রয় করুন'
                });
            }

            if (amount > 10000) {
                return res.status(400).json({
                    success: false,
                    message: 'সর্বোচ্চ ১০,০০০ টি এসএমএস ক্রয় করতে পারবেন'
                });
            }

            if (!paymentMethod) {
                return res.status(400).json({
                    success: false,
                    message: 'পেমেন্ট মেথড নির্বাচন করুন'
                });
            }

            // Calculate price
            const pricePerSMS = 0.40;
            let totalPrice = amount * pricePerSMS;
            let onlineCharge = 0;

            if (paymentMethod === 'online') {
                onlineCharge = totalPrice * 0.025; // 2.5% online charge
                totalPrice += onlineCharge;
            }

            const purchaseData = {
                amount: parseInt(amount),
                pricePerSMS: pricePerSMS,
                basePrice: amount * pricePerSMS,
                onlineCharge: onlineCharge,
                totalPrice: totalPrice,
                paymentMethod: paymentMethod,
                transactionId: transactionId || null,
                phoneNumber: phoneNumber || null,
                status: paymentMethod === 'online' ? 'pending' : 'waiting_approval',
                purchaseDate: new Date(),
                approvedAt: null,
                approvedBy: null
            };

            const result = await smsPurchaseCollection.insertOne(purchaseData);

            res.status(201).json({
                success: true,
                message: paymentMethod === 'online' 
                    ? 'অনলাইন পেমেন্ট রিকোয়েস্ট তৈরি হয়েছে' 
                    : 'ম্যানুয়াল রিকোয়েস্ট তৈরি হয়েছে',
                data: {
                    _id: result.insertedId,
                    ...purchaseData,
                    paymentInstructions: paymentMethod === 'manual' ? {
                        bKashNumber: '01796323631',
                        instructions: 'bKash এ ফি পরিশোধ করুন এবং ট্রানজেকশন আইডি আমাদের জানান'
                    } : null
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'এসএমএস ক্রয় রিকোয়েস্ট তৈরি করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // UPDATE purchase status (Admin only)
    router.patch('/purchase/:id/approve', async (req, res) => {
        try {
            const { id } = req.params;
            const { approvedBy } = req.body;

            const purchase = await smsPurchaseCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!purchase) {
                return res.status(404).json({
                    success: false,
                    message: 'ক্রয় রিকোয়েস্ট পাওয়া যায়নি'
                });
            }

            if (purchase.status !== 'waiting_approval') {
                return res.status(400).json({
                    success: false,
                    message: 'শুধুমাত্র অপেক্ষমান রিকোয়েস্ট অ্যাপ্রুভ করা যাবে'
                });
            }

            // Update purchase status
            await smsPurchaseCollection.updateOne(
                { _id: new ObjectId(id) },
                { 
                    $set: { 
                        status: 'approved',
                        approvedAt: new Date(),
                        approvedBy: approvedBy
                    } 
                }
            );

            // Update SMS balance
            let balance = await smsBalanceCollection.findOne({ type: 'current' });
            if (!balance) {
                balance = {
                    type: 'current',
                    totalSMS: purchase.amount,
                    usedSMS: 0,
                    remainingSMS: purchase.amount,
                    lastUpdated: new Date(),
                    createdAt: new Date()
                };
                await smsBalanceCollection.insertOne(balance);
            } else {
                await smsBalanceCollection.updateOne(
                    { type: 'current' },
                    { 
                        $set: { 
                            totalSMS: balance.totalSMS + purchase.amount,
                            remainingSMS: balance.remainingSMS + purchase.amount,
                            lastUpdated: new Date()
                        } 
                    }
                );
            }

            res.json({
                success: true,
                message: 'এসএমএস ক্রয় সফলভাবে অ্যাপ্রুভ হয়েছে',
                data: {
                    addedSMS: purchase.amount,
                    newBalance: balance.remainingSMS + purchase.amount
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ক্রয় রিকোয়েস্ট অ্যাপ্রুভ করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // UPDATE SMS balance after sending SMS
    router.patch('/update-balance', async (req, res) => {
        try {
            const { usedSMS } = req.body;

            if (!usedSMS || usedSMS <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'ব্যবহারকৃত এসএমএস সংখ্যা প্রয়োজন'
                });
            }

            let balance = await smsBalanceCollection.findOne({ type: 'current' });
            
            if (!balance) {
                return res.status(404).json({
                    success: false,
                    message: 'এসএমএস ব্যালেন্স পাওয়া যায়নি'
                });
            }

            if (balance.remainingSMS < usedSMS) {
                return res.status(400).json({
                    success: false,
                    message: 'পর্যাপ্ত এসএমএস ব্যালেন্স নেই'
                });
            }

            const newUsedSMS = balance.usedSMS + usedSMS;
            const newRemainingSMS = balance.remainingSMS - usedSMS;

            await smsBalanceCollection.updateOne(
                { type: 'current' },
                { 
                    $set: { 
                        usedSMS: newUsedSMS,
                        remainingSMS: newRemainingSMS,
                        lastUpdated: new Date()
                    } 
                }
            );

            res.json({
                success: true,
                message: 'এসএমএস ব্যালেন্স আপডেট হয়েছে',
                data: {
                    usedSMS: usedSMS,
                    newUsedSMS: newUsedSMS,
                    newRemainingSMS: newRemainingSMS
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'এসএমএস ব্যালেন্স আপডেট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    return router;
};