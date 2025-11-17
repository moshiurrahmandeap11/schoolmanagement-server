// Backend Route (contactInfo.js)
const express = require('express');
const router = express.Router();
const { ObjectId } = require("mongodb");

module.exports = (contactInfoCollection) => {

    // GET contact info
    router.get('/', async (req, res) => {
        try {
            // Since there's only one contact info document, we'll get the first one
            const contactInfo = await contactInfoCollection.findOne({});
            
            res.json({
                success: true,
                data: contactInfo
            });
        } catch (error) {
            console.error('Error fetching contact info:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch contact information'
            });
        }
    });

    // POST create or update contact info
    router.post('/', async (req, res) => {
        try {
            const { address, phone1, phone2, email, eiin, googleMapLink } = req.body;

            if (!address || !phone1 || !email || !eiin) {
                return res.status(400).json({
                    success: false,
                    message: 'Address, phone1, email and EIIN are required'
                });
            }

            // Check if contact info already exists
            const existingData = await contactInfoCollection.findOne({});

            if (existingData) {
                // Update existing data
                const result = await contactInfoCollection.updateOne(
                    { _id: existingData._id },
                    { 
                        $set: { 
                            address,
                            phone1,
                            phone2: phone2 || '',
                            email,
                            eiin,
                            googleMapLink: googleMapLink || '',
                            updatedAt: new Date()
                        } 
                    }
                );

                res.json({
                    success: true,
                    message: 'Contact information updated successfully'
                });
            } else {
                // Create new data
                const newData = {
                    address,
                    phone1,
                    phone2: phone2 || '',
                    email,
                    eiin,
                    googleMapLink: googleMapLink || '',
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                const result = await contactInfoCollection.insertOne(newData);

                res.json({
                    success: true,
                    message: 'Contact information created successfully',
                    data: { ...newData, _id: result.insertedId }
                });
            }
        } catch (error) {
            console.error('Error saving contact info:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to save contact information'
            });
        }
    });


router.put('/:id', async (req, res) => {
    try {
        const { address, phone1, phone2, email, eiin, googleMapLink } = req.body;

        if (!address || !phone1 || !email || !eiin) {
            return res.status(400).json({
                success: false,
                message: 'Address, phone1, email and EIIN are required'
            });
        }

        const result = await contactInfoCollection.updateOne(
            { _id: new ObjectId(req.params.id) },
            {
                $set: {
                    address,
                    phone1,
                    phone2: phone2 || '',
                    email,
                    eiin,
                    googleMapLink: googleMapLink || '',
                    updatedAt: new Date()
                }
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Contact information not found'
            });
        }

        res.json({
            success: true,
            message: 'Contact information updated successfully'
        });

    } catch (error) {
        console.error('Error updating contact info:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update contact information'
        });
    }
});


    return router;
};