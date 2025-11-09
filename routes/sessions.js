const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (sessionsCollection) => {

    // GET all sessions
    router.get('/', async (req, res) => {
        try {
            const sessions = await sessionsCollection.find({}).sort({ startDate: -1 }).toArray();
            
            res.json({
                success: true,
                data: sessions,
                message: 'Sessions fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching sessions:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching sessions',
                error: error.message
            });
        }
    });

    // GET single session by ID
    router.get('/:id', async (req, res) => {
        try {
            const session = await sessionsCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!session) {
                return res.status(404).json({
                    success: false,
                    message: 'Session not found'
                });
            }

            res.json({
                success: true,
                data: session
            });
        } catch (error) {
            console.error('Error fetching session:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching session',
                error: error.message
            });
        }
    });

    // CREATE new session
    router.post('/', async (req, res) => {
        try {
            const sessionData = req.body;

            // Validation
            if (!sessionData.name || !sessionData.startDate || !sessionData.endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Session name, start date and end date are required'
                });
            }

            // Check if session name already exists
            const existingSession = await sessionsCollection.findOne({
                name: sessionData.name
            });

            if (existingSession) {
                return res.status(400).json({
                    success: false,
                    message: 'Session name already exists'
                });
            }

            // If this session is set as current, update all other sessions to not current
            if (sessionData.isCurrent) {
                await sessionsCollection.updateMany(
                    { isCurrent: true },
                    { $set: { isCurrent: false } }
                );
            }

            const newSession = {
                name: sessionData.name,
                isCurrent: sessionData.isCurrent || false,
                startDate: new Date(sessionData.startDate),
                endDate: new Date(sessionData.endDate),
                totalWorkingDays: parseInt(sessionData.totalWorkingDays) || 0,
                description: sessionData.description || '',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await sessionsCollection.insertOne(newSession);
            
            res.status(201).json({
                success: true,
                message: 'Session created successfully',
                data: {
                    _id: result.insertedId,
                    ...newSession
                }
            });
        } catch (error) {
            console.error('Error creating session:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating session',
                error: error.message
            });
        }
    });

    // UPDATE session
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const sessionData = req.body;

            const existingSession = await sessionsCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!existingSession) {
                return res.status(404).json({
                    success: false,
                    message: 'Session not found'
                });
            }

            // Check if session name already exists (excluding current session)
            if (sessionData.name !== existingSession.name) {
                const duplicateSession = await sessionsCollection.findOne({
                    name: sessionData.name,
                    _id: { $ne: new ObjectId(id) }
                });

                if (duplicateSession) {
                    return res.status(400).json({
                        success: false,
                        message: 'Session name already exists'
                    });
                }
            }

            // If this session is set as current, update all other sessions to not current
            if (sessionData.isCurrent) {
                await sessionsCollection.updateMany(
                    { 
                        isCurrent: true,
                        _id: { $ne: new ObjectId(id) }
                    },
                    { $set: { isCurrent: false } }
                );
            }

            const updateData = {
                name: sessionData.name,
                isCurrent: sessionData.isCurrent || false,
                startDate: new Date(sessionData.startDate),
                endDate: new Date(sessionData.endDate),
                totalWorkingDays: parseInt(sessionData.totalWorkingDays) || 0,
                description: sessionData.description || '',
                updatedAt: new Date()
            };

            const result = await sessionsCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            res.json({
                success: true,
                message: 'Session updated successfully'
            });
        } catch (error) {
            console.error('Error updating session:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating session',
                error: error.message
            });
        }
    });

    // DELETE session
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const session = await sessionsCollection.findOne({ 
                _id: new ObjectId(id) 
            });

            if (!session) {
                return res.status(404).json({
                    success: false,
                    message: 'Session not found'
                });
            }

            // Check if this is the current session
            if (session.isCurrent) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete current session. Please set another session as current first.'
                });
            }

            await sessionsCollection.deleteOne({ 
                _id: new ObjectId(id) 
            });

            res.json({
                success: true,
                message: 'Session deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting session:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting session',
                error: error.message
            });
        }
    });

    // GET current session
    router.get('/current/active', async (req, res) => {
        try {
            const currentSession = await sessionsCollection.findOne({
                isCurrent: true,
                isActive: true
            });

            res.json({
                success: true,
                data: currentSession
            });
        } catch (error) {
            console.error('Error fetching current session:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching current session',
                error: error.message
            });
        }
    });

    return router;
};