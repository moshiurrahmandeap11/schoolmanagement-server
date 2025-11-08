const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (facilitiesCollection) => {

    // Configure multer for facility images
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            const uploadDir = path.join(__dirname, '../uploads/facilities');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, 'facility-' + uniqueSuffix + path.extname(file.originalname));
        }
    });

    const fileFilter = (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    };

    const upload = multer({
        storage: storage,
        fileFilter: fileFilter,
        limits: {
            fileSize: 2 * 1024 * 1024 // 2MB
        }
    });

    // GET all facilities
    router.get('/', async (req, res) => {
        try {
            const facilities = await facilitiesCollection.find({}).sort({ createdAt: -1 }).toArray();
            res.json({
                success: true,
                data: facilities,
                count: facilities.length
            });
        } catch (error) {
            console.error('Error fetching facilities:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch facilities'
            });
        }
    });

    // GET single facility by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const facility = await facilitiesCollection.findOne({ _id: new ObjectId(id) });

            if (!facility) {
                return res.status(404).json({
                    success: false,
                    message: 'Facility not found'
                });
            }

            res.json({
                success: true,
                data: facility
            });
        } catch (error) {
            console.error('Error fetching facility:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch facility'
            });
        }
    });

    // CREATE new facility
    router.post('/', async (req, res) => {
        try {
            const { 
                name,
                description,
                image
            } = req.body;

            // Validation
            if (!name || !description) {
                return res.status(400).json({
                    success: false,
                    message: 'Facility name and description are required fields'
                });
            }

            const newFacility = {
                name: name.trim(),
                description: description,
                image: image || '',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await facilitiesCollection.insertOne(newFacility);

            if (result.insertedId) {
                const createdFacility = await facilitiesCollection.findOne({ _id: result.insertedId });
                res.status(201).json({
                    success: true,
                    message: 'Facility created successfully',
                    data: createdFacility
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to create facility'
                });
            }
        } catch (error) {
            console.error('Error creating facility:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create facility'
            });
        }
    });

    // UPDATE facility
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { 
                name,
                description,
                image
            } = req.body;

            // Validation
            if (!name || !description) {
                return res.status(400).json({
                    success: false,
                    message: 'Facility name and description are required fields'
                });
            }

            const updateData = {
                name: name.trim(),
                description: description,
                updatedAt: new Date()
            };

            // Only update image if provided
            if (image !== undefined) {
                updateData.image = image;
            }

            const result = await facilitiesCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.modifiedCount > 0) {
                const updatedFacility = await facilitiesCollection.findOne({ _id: new ObjectId(id) });
                res.json({
                    success: true,
                    message: 'Facility updated successfully',
                    data: updatedFacility
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Facility not found or no changes made'
                });
            }
        } catch (error) {
            console.error('Error updating facility:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update facility'
            });
        }
    });

    // DELETE facility
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            // Get facility data first to delete image file
            const facility = await facilitiesCollection.findOne({ _id: new ObjectId(id) });
            
            if (!facility) {
                return res.status(404).json({
                    success: false,
                    message: 'Facility not found'
                });
            }

            // Delete image file if it exists
            if (facility.image && facility.image.startsWith('/api/uploads/facilities/')) {
                const filename = facility.image.replace('/api/uploads/facilities/', '');
                const imagePath = path.join(__dirname, '..', 'uploads', 'facilities', filename);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }

            const result = await facilitiesCollection.deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount > 0) {
                res.json({
                    success: true,
                    message: 'Facility deleted successfully'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Facility not found'
                });
            }
        } catch (error) {
            console.error('Error deleting facility:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete facility'
            });
        }
    });

    // UPLOAD facility image
    router.post('/upload', upload.single('image'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            const fileUrl = `/api/uploads/facilities/${req.file.filename}`;

            res.json({
                success: true,
                message: 'File uploaded successfully',
                fileUrl: fileUrl,
                fileName: req.file.filename
            });
        } catch (error) {
            console.error('Error uploading file:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to upload file'
            });
        }
    });

    // DELETE facility image
    router.delete('/image/:filename', async (req, res) => {
        try {
            const { filename } = req.params;
            const filePath = path.join(__dirname, '..', 'uploads', 'facilities', filename);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                res.json({
                    success: true,
                    message: 'Image deleted successfully'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Image not found'
                });
            }
        } catch (error) {
            console.error('Error deleting image:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete image'
            });
        }
    });

    // TOGGLE facility status
    router.patch('/:id/toggle', async (req, res) => {
        try {
            const facility = await facilitiesCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!facility) {
                return res.status(404).json({
                    success: false,
                    message: 'Facility not found'
                });
            }

            const result = await facilitiesCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { 
                    $set: { 
                        isActive: !facility.isActive,
                        updatedAt: new Date()
                    } 
                }
            );

            res.json({
                success: true,
                message: `Facility ${!facility.isActive ? 'activated' : 'deactivated'} successfully`,
                data: {
                    isActive: !facility.isActive
                }
            });
        } catch (error) {
            console.error('Error toggling facility status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to toggle facility status'
            });
        }
    });

    return router;
};