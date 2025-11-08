const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (authorsCollection) => {

    // Configure multer for author images
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            const uploadDir = path.join(__dirname, '../uploads/authors');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, 'author-' + uniqueSuffix + path.extname(file.originalname));
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

    // GET all authors
    router.get('/', async (req, res) => {
        try {
            const authors = await authorsCollection.find({}).sort({ name: 1 }).toArray();
            res.json({
                success: true,
                data: authors,
                count: authors.length
            });
        } catch (error) {
            console.error('Error fetching authors:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch authors'
            });
        }
    });

    // GET single author by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const author = await authorsCollection.findOne({ _id: new ObjectId(id) });

            if (!author) {
                return res.status(404).json({
                    success: false,
                    message: 'Author not found'
                });
            }

            res.json({
                success: true,
                data: author
            });
        } catch (error) {
            console.error('Error fetching author:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch author'
            });
        }
    });

    // CREATE new author
    router.post('/', async (req, res) => {
        try {
            const { 
                name,
                designation,
                biography,
                image
            } = req.body;

            // Validation
            if (!name || !biography) {
                return res.status(400).json({
                    success: false,
                    message: 'Author name and biography are required fields'
                });
            }

            // Check if author with same name already exists
            const existingAuthor = await authorsCollection.findOne({ 
                name: new RegExp(name, 'i') 
            });

            if (existingAuthor) {
                return res.status(400).json({
                    success: false,
                    message: 'An author with this name already exists'
                });
            }

            const newAuthor = {
                name: name.trim(),
                designation: designation?.trim() || '',
                biography: biography,
                image: image || '',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await authorsCollection.insertOne(newAuthor);

            if (result.insertedId) {
                const createdAuthor = await authorsCollection.findOne({ _id: result.insertedId });
                res.status(201).json({
                    success: true,
                    message: 'Author created successfully',
                    data: createdAuthor
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to create author'
                });
            }
        } catch (error) {
            console.error('Error creating author:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create author'
            });
        }
    });

    // UPDATE author
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { 
                name,
                designation,
                biography,
                image
            } = req.body;

            // Validation
            if (!name || !biography) {
                return res.status(400).json({
                    success: false,
                    message: 'Author name and biography are required fields'
                });
            }

            // Check if author with same name already exists for other authors
            const existingAuthor = await authorsCollection.findOne({ 
                name: new RegExp(name, 'i'),
                _id: { $ne: new ObjectId(id) } 
            });

            if (existingAuthor) {
                return res.status(400).json({
                    success: false,
                    message: 'An author with this name already exists'
                });
            }

            const updateData = {
                name: name.trim(),
                designation: designation?.trim() || '',
                biography: biography,
                updatedAt: new Date()
            };

            // Only update image if provided
            if (image !== undefined) {
                updateData.image = image;
            }

            const result = await authorsCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.modifiedCount > 0) {
                const updatedAuthor = await authorsCollection.findOne({ _id: new ObjectId(id) });
                res.json({
                    success: true,
                    message: 'Author updated successfully',
                    data: updatedAuthor
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Author not found or no changes made'
                });
            }
        } catch (error) {
            console.error('Error updating author:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update author'
            });
        }
    });

    // DELETE author
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            // Get author data first to delete image file
            const author = await authorsCollection.findOne({ _id: new ObjectId(id) });
            
            if (!author) {
                return res.status(404).json({
                    success: false,
                    message: 'Author not found'
                });
            }

            // Delete image file if it exists
            if (author.image && author.image.startsWith('/api/uploads/authors/')) {
                const filename = author.image.replace('/api/uploads/authors/', '');
                const imagePath = path.join(__dirname, '..', 'uploads', 'authors', filename);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }

            const result = await authorsCollection.deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount > 0) {
                res.json({
                    success: true,
                    message: 'Author deleted successfully'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Author not found'
                });
            }
        } catch (error) {
            console.error('Error deleting author:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete author'
            });
        }
    });

    // UPLOAD author image
    router.post('/upload', upload.single('image'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            const fileUrl = `/api/uploads/authors/${req.file.filename}`;

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

    // DELETE author image
    router.delete('/image/:filename', async (req, res) => {
        try {
            const { filename } = req.params;
            const filePath = path.join(__dirname, '..', 'uploads', 'authors', filename);

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

    // TOGGLE author status
    router.patch('/:id/toggle', async (req, res) => {
        try {
            const author = await authorsCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!author) {
                return res.status(404).json({
                    success: false,
                    message: 'Author not found'
                });
            }

            const result = await authorsCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { 
                    $set: { 
                        isActive: !author.isActive,
                        updatedAt: new Date()
                    } 
                }
            );

            res.json({
                success: true,
                message: `Author ${!author.isActive ? 'activated' : 'deactivated'} successfully`,
                data: {
                    isActive: !author.isActive
                }
            });
        } catch (error) {
            console.error('Error toggling author status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to toggle author status'
            });
        }
    });

    return router;
};