const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (contactCollection) => {

    // GET all contacts
    router.get('/', async (req, res) => {
        try {
            const contacts = await contactCollection.find({}).sort({ createdAt: -1 }).toArray();
            
            res.json({
                success: true,
                data: contacts,
                total: contacts.length,
                message: 'Contacts fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching contacts:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching contacts',
                error: error.message
            });
        }
    });

    // POST new contact
    router.post('/', async (req, res) => {
        try {
            const { 
                name, 
                mobile, 
                email, 
                subject, 
                message 
            } = req.body;

            // Validation
            if (!name || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'নাম প্রয়োজন'
                });
            }

            if (!mobile || !mobile.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'মোবাইল নম্বর প্রয়োজন'
                });
            }

            // Mobile number validation
            const mobileRegex = /^(?:\+88|01)?\d{11}$/;
            if (!mobileRegex.test(mobile.replace(/\s/g, ''))) {
                return res.status(400).json({
                    success: false,
                    message: 'সঠিক মোবাইল নম্বর দিন'
                });
            }

            if (!subject || !subject.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'বিষয় প্রয়োজন'
                });
            }

            if (!message || !message.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'মেসেজ প্রয়োজন'
                });
            }

            const newContact = {
                name: name.trim(),
                mobile: mobile.trim(),
                email: email?.trim() || '',
                subject: subject.trim(),
                message: message.trim(),
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await contactCollection.insertOne(newContact);
            
            res.status(201).json({
                success: true,
                message: 'যোগাযোগ তথ্য সফলভাবে তৈরি হয়েছে',
                data: {
                    _id: result.insertedId,
                    ...newContact
                }
            });
        } catch (error) {
            console.error('Error creating contact:', error);
            res.status(500).json({
                success: false,
                message: 'যোগাযোগ তথ্য তৈরি করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // DELETE contact
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid contact ID'
                });
            }

            const result = await contactCollection.deleteOne({ 
                _id: new ObjectId(id) 
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Contact not found'
                });
            }

            res.json({
                success: true,
                message: 'যোগাযোগ তথ্য সফলভাবে ডিলিট হয়েছে'
            });
        } catch (error) {
            console.error('Error deleting contact:', error);
            res.status(500).json({
                success: false,
                message: 'যোগাযোগ তথ্য ডিলিট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    return router;
};