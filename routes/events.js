const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (eventsCollection) => {

    // Configure multer for event images
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            const uploadDir = path.join(__dirname, '../uploads/events');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, 'event-' + uniqueSuffix + path.extname(file.originalname));
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

    // GET all events
    router.get('/', async (req, res) => {
        try {
            const events = await eventsCollection.find({}).sort({ date: 1 }).toArray();
            res.json({
                success: true,
                data: events,
                count: events.length
            });
        } catch (error) {
            console.error('Error fetching events:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch events'
            });
        }
    });

    // GET single event by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const event = await eventsCollection.findOne({ _id: new ObjectId(id) });

            if (!event) {
                return res.status(404).json({
                    success: false,
                    message: 'Event not found'
                });
            }

            res.json({
                success: true,
                data: event
            });
        } catch (error) {
            console.error('Error fetching event:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch event'
            });
        }
    });

    // CREATE new event
    router.post('/', async (req, res) => {
        try {
            const { 
                name,
                date,
                startTime,
                endTime,
                address,
                description,
                status,
                images
            } = req.body;

            // Validation
            if (!name || !date) {
                return res.status(400).json({
                    success: false,
                    message: 'Event name and date are required fields'
                });
            }

            // Date validation
            const eventDate = new Date(date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (eventDate < today) {
                return res.status(400).json({
                    success: false,
                    message: 'Event date cannot be in the past'
                });
            }

            const newEvent = {
                name: name.trim(),
                date: new Date(date),
                startTime: startTime || '',
                endTime: endTime || '',
                address: address?.trim() || '',
                description: description || '',
                status: status || 'Draft',
                images: images || [],
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await eventsCollection.insertOne(newEvent);

            if (result.insertedId) {
                const createdEvent = await eventsCollection.findOne({ _id: result.insertedId });
                res.status(201).json({
                    success: true,
                    message: 'Event created successfully',
                    data: createdEvent
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to create event'
                });
            }
        } catch (error) {
            console.error('Error creating event:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create event'
            });
        }
    });

    // UPDATE event
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { 
                name,
                date,
                startTime,
                endTime,
                address,
                description,
                status,
                images
            } = req.body;

            // Validation
            if (!name || !date) {
                return res.status(400).json({
                    success: false,
                    message: 'Event name and date are required fields'
                });
            }

            // Date validation
            const eventDate = new Date(date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (eventDate < today) {
                return res.status(400).json({
                    success: false,
                    message: 'Event date cannot be in the past'
                });
            }

            const updateData = {
                name: name.trim(),
                date: new Date(date),
                startTime: startTime || '',
                endTime: endTime || '',
                address: address?.trim() || '',
                description: description || '',
                status: status || 'Draft',
                images: images || [],
                updatedAt: new Date()
            };

            const result = await eventsCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.modifiedCount > 0) {
                const updatedEvent = await eventsCollection.findOne({ _id: new ObjectId(id) });
                res.json({
                    success: true,
                    message: 'Event updated successfully',
                    data: updatedEvent
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Event not found or no changes made'
                });
            }
        } catch (error) {
            console.error('Error updating event:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update event'
            });
        }
    });

    // DELETE event
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            // Get event data first to delete image files
            const event = await eventsCollection.findOne({ _id: new ObjectId(id) });
            
            if (!event) {
                return res.status(404).json({
                    success: false,
                    message: 'Event not found'
                });
            }

            // Delete image files if they exist
            if (event.images && event.images.length > 0) {
                event.images.forEach(imageUrl => {
                    if (imageUrl.startsWith('/api/uploads/events/')) {
                        const filename = imageUrl.replace('/api/uploads/events/', '');
                        const imagePath = path.join(__dirname, '..', 'uploads', 'events', filename);
                        if (fs.existsSync(imagePath)) {
                            fs.unlinkSync(imagePath);
                        }
                    }
                });
            }

            const result = await eventsCollection.deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount > 0) {
                res.json({
                    success: true,
                    message: 'Event deleted successfully'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Event not found'
                });
            }
        } catch (error) {
            console.error('Error deleting event:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete event'
            });
        }
    });

    // UPLOAD event image
    router.post('/upload', upload.single('image'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            const fileUrl = `/api/uploads/events/${req.file.filename}`;

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

    // DELETE event image
    router.delete('/image/:filename', async (req, res) => {
        try {
            const { filename } = req.params;
            const filePath = path.join(__dirname, '..', 'uploads', 'events', filename);

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

    // TOGGLE event status
    router.patch('/:id/toggle', async (req, res) => {
        try {
            const event = await eventsCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!event) {
                return res.status(404).json({
                    success: false,
                    message: 'Event not found'
                });
            }

            const result = await eventsCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { 
                    $set: { 
                        isActive: !event.isActive,
                        updatedAt: new Date()
                    } 
                }
            );

            res.json({
                success: true,
                message: `Event ${!event.isActive ? 'activated' : 'deactivated'} successfully`,
                data: {
                    isActive: !event.isActive
                }
            });
        } catch (error) {
            console.error('Error toggling event status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to toggle event status'
            });
        }
    });

    return router;
};