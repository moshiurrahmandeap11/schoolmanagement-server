// routes/branches.js
const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

module.exports = (branchesCollection) => {

    // GET all branches
    router.get('/', async (req, res) => {
        try {
            const branches = await branchesCollection.find().toArray();
            res.json({
                success: true,
                data: branches
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'শাখা লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // CREATE new branch with image upload
    router.post('/', upload.single('logo'), async (req, res) => {
        try {
            const { name, address, phone, email, website, establishedYear } = req.body;

            // Validation
            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: 'শাখার নাম আবশ্যক'
                });
            }

            const logoPath = req.file 
                ? `/api/uploads/${req.file.filename}` 
                : '/api/uploads/default-branch-logo.png'; // ডিফল্ট লোগো (চাইলে রাখো)

            const newBranch = {
                name: name.trim(),
                address: address?.trim() || '',
                phone: phone?.trim() || '',
                email: email?.trim() || '',
                website: website?.trim() || '',
                establishedYear: establishedYear || null,
                logo: logoPath,
                logoOriginalName: req.file?.originalname || 'default.png',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await branchesCollection.insertOne(newBranch);

            res.status(201).json({
                success: true,
                message: 'নতুন শাখা সফলভাবে তৈরি হয়েছে',
                data: {
                    _id: result.insertedId,
                    ...newBranch
                }
            });
        } catch (error) {
            // If file uploaded but error occurred, delete the file
            if (req.file) {
                const filePath = path.join(__dirname, '..', 'uploads', req.file.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            res.status(500).json({
                success: false,
                message: 'শাখা তৈরি করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // UPDATE branch (with optional image update)
    router.put('/:id', upload.single('logo'), async (req, res) => {
        try {
            const branchId = req.params.id;
            if (!ObjectId.isValid(branchId)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ শাখা আইডি'
                });
            }

            const { name, address, phone, email, website, establishedYear } = req.body;

            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: 'শাখার নাম আবশ্যক'
                });
            }

            const existingBranch = await branchesCollection.findOne({ _id: new ObjectId(branchId) });
            if (!existingBranch) {
                if (req.file) {
                    const filePath = path.join(__dirname, '..', 'uploads', req.file.filename);
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                }
                return res.status(404).json({
                    success: false,
                    message: 'শাখা পাওয়া যায়নি'
                });
            }

            // Handle logo update
            let logoPath = existingBranch.logo;
            let logoOriginalName = existingBranch.logoOriginalName;

            if (req.file) {
                // Delete old logo if not default
                if (existingBranch.logo && existingBranch.logo.startsWith('/api/uploads/') && existingBranch.logo !== '/api/uploads/default-branch-logo.png') {
                    const oldFileName = existingBranch.logo.replace('/api/uploads/', '');
                    const oldFilePath = path.join(__dirname, '..', 'uploads', oldFileName);
                    if (fs.existsSync(oldFilePath)) {
                        fs.unlinkSync(oldFilePath);
                    }
                }

                logoPath = `/api/uploads/${req.file.filename}`;
                logoOriginalName = req.file.originalname;
            }

            const updatedBranch = {
                name: name.trim(),
                address: address?.trim() || '',
                phone: phone?.trim() || '',
                email: email?.trim() || '',
                website: website?.trim() || '',
                establishedYear: establishedYear || null,
                logo: logoPath,
                logoOriginalName: logoOriginalName,
                updatedAt: new Date()
            };

            const result = await branchesCollection.updateOne(
                { _id: new ObjectId(branchId) },
                { $set: updatedBranch }
            );

            res.json({
                success: true,
                message: 'শাখা সফলভাবে আপডেট হয়েছে',
                data: {
                    _id: branchId,
                    ...updatedBranch
                }
            });
        } catch (error) {
            if (req.file) {
                const filePath = path.join(__dirname, '..', 'uploads', req.file.filename);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
            res.status(500).json({
                success: false,
                message: 'শাখা আপডেট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // DELETE branch
    router.delete('/:id', async (req, res) => {
        try {
            const branchId = req.params.id;
            if (!ObjectId.isValid(branchId)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ শাখা আইডি'
                });
            }

            const branch = await branchesCollection.findOne({ _id: new ObjectId(branchId) });
            if (!branch) {
                return res.status(404).json({
                    success: false,
                    message: 'শাখা পাওয়া যায়নি'
                });
            }

            // Delete logo file (except default)
            if (branch.logo && branch.logo.startsWith('/api/uploads/') && branch.logo !== '/api/uploads/default-branch-logo.png') {
                const filename = branch.logo.replace('/api/uploads/', '');
                const imagePath = path.join(__dirname, '..', 'uploads', filename);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }

            await branchesCollection.deleteOne({ _id: new ObjectId(branchId) });

            res.json({
                success: true,
                message: 'শাখা সফলভাবে মুছে ফেলা হয়েছে'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'শাখা ডিলিট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // TOGGLE branch active status
    router.patch('/:id/toggle', async (req, res) => {
        try {
            const branchId = req.params.id;
            if (!ObjectId.isValid(branchId)) {
                return res.status(400).json({
                    success: false,
                    message: 'অবৈধ শাখা আইডি'
                });
            }

            const branch = await branchesCollection.findOne({ _id: new ObjectId(branchId) });
            if (!branch) {
                return res.status(404).json({
                    success: false,
                    message: 'শাখা পাওয়া যায়নি'
                });
            }

            const result = await branchesCollection.updateOne(
                { _id: new ObjectId(branchId) },
                { 
                    $set: { 
                        isActive: !branch.isActive,
                        updatedAt: new Date()
                    } 
                }
            );

            res.json({
                success: true,
                message: `শাখা ${!branch.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে`,
                data: {
                    isActive: !branch.isActive
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'শাখার স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    return router;
};