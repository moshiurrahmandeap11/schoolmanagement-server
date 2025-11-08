const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (adminContactCollection) => {

    // GET all contacts
    router.get('/', async (req, res) => {
        try {
            const contacts = await adminContactCollection.find({}).toArray();
            res.json({
                success: true,
                data: contacts,
                count: contacts.length
            });
        } catch (error) {
            console.error('Error fetching contacts:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch contacts'
            });
        }
    });

    // GET single contact by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const contact = await adminContactCollection.findOne({ _id: new ObjectId(id) });

            if (!contact) {
                return res.status(404).json({
                    success: false,
                    message: 'Contact not found'
                });
            }

            res.json({
                success: true,
                data: contact
            });
        } catch (error) {
            console.error('Error fetching contact:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch contact'
            });
        }
    });

    // CREATE new contact
    router.post('/', async (req, res) => {
        try {
            const { 
                contactTitle,
                mobile,
                email,
                address,
                thanaDistrict,
                postOffice
            } = req.body;

            // Validation
            if (!contactTitle || !mobile) {
                return res.status(400).json({
                    success: false,
                    message: 'Contact title and mobile are required fields'
                });
            }

            // Mobile number validation
            const mobileRegex = /^[0-9]{11}$/;
            if (!mobileRegex.test(mobile)) {
                return res.status(400).json({
                    success: false,
                    message: 'Please enter a valid 11-digit mobile number'
                });
            }

            // Check if mobile already exists
            const existingContact = await adminContactCollection.findOne({ mobile });
            if (existingContact) {
                return res.status(400).json({
                    success: false,
                    message: 'A contact with this mobile number already exists'
                });
            }

            const newContact = {
                contactTitle: contactTitle.trim(),
                mobile: mobile.trim(),
                email: email?.trim() || '',
                address: address?.trim() || '',
                thanaDistrict: thanaDistrict?.trim() || '',
                postOffice: postOffice?.trim() || '',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await adminContactCollection.insertOne(newContact);

            if (result.insertedId) {
                const createdContact = await adminContactCollection.findOne({ _id: result.insertedId });
                res.status(201).json({
                    success: true,
                    message: 'Contact created successfully',
                    data: createdContact
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to create contact'
                });
            }
        } catch (error) {
            console.error('Error creating contact:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create contact'
            });
        }
    });

    // UPDATE contact
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { 
                contactTitle,
                mobile,
                email,
                address,
                thanaDistrict,
                postOffice
            } = req.body;

            // Validation
            if (!contactTitle || !mobile) {
                return res.status(400).json({
                    success: false,
                    message: 'Contact title and mobile are required fields'
                });
            }

            // Mobile number validation
            const mobileRegex = /^[0-9]{11}$/;
            if (!mobileRegex.test(mobile)) {
                return res.status(400).json({
                    success: false,
                    message: 'Please enter a valid 11-digit mobile number'
                });
            }

            // Check if mobile already exists for other contacts
            const existingContact = await adminContactCollection.findOne({ 
                mobile, 
                _id: { $ne: new ObjectId(id) } 
            });
            
            if (existingContact) {
                return res.status(400).json({
                    success: false,
                    message: 'A contact with this mobile number already exists'
                });
            }

            const updateData = {
                contactTitle: contactTitle.trim(),
                mobile: mobile.trim(),
                email: email?.trim() || '',
                address: address?.trim() || '',
                thanaDistrict: thanaDistrict?.trim() || '',
                postOffice: postOffice?.trim() || '',
                updatedAt: new Date()
            };

            const result = await adminContactCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.modifiedCount > 0) {
                const updatedContact = await adminContactCollection.findOne({ _id: new ObjectId(id) });
                res.json({
                    success: true,
                    message: 'Contact updated successfully',
                    data: updatedContact
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Contact not found or no changes made'
                });
            }
        } catch (error) {
            console.error('Error updating contact:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update contact'
            });
        }
    });

    // DELETE contact
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            const result = await adminContactCollection.deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount > 0) {
                res.json({
                    success: true,
                    message: 'Contact deleted successfully'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Contact not found'
                });
            }
        } catch (error) {
            console.error('Error deleting contact:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete contact'
            });
        }
    });

    // TOGGLE contact status
    router.patch('/:id/toggle', async (req, res) => {
        try {
            const contact = await adminContactCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!contact) {
                return res.status(404).json({
                    success: false,
                    message: 'Contact not found'
                });
            }

            const result = await adminContactCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { 
                    $set: { 
                        isActive: !contact.isActive,
                        updatedAt: new Date()
                    } 
                }
            );

            res.json({
                success: true,
                message: `Contact ${!contact.isActive ? 'activated' : 'deactivated'} successfully`,
                data: {
                    isActive: !contact.isActive
                }
            });
        } catch (error) {
            console.error('Error toggling contact status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to toggle contact status'
            });
        }
    });

    return router;
};