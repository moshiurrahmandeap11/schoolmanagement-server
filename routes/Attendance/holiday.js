const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

module.exports = (holidaysCollection) => {

 router.get('/', async (req, res) => {
  try {
    const holidays = await holidaysCollection
      .find({ isActive: true })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      data: holidays,
      message: 'Holidays fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching holidays:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching holidays'
    });
  }
});


    // Get holiday by ID
    router.get('/:id', async (req, res) => {
        try {
            if (!ObjectId.isValid(req.params.id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid holiday ID'
                });
            }

            const holiday = await holidaysCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!holiday) {
                return res.status(404).json({
                    success: false,
                    message: 'Holiday not found'
                });
            }

            // Populate session data manually
            if (holiday.session && ObjectId.isValid(holiday.session)) {
                try {
                    const session = await req.app.locals.db.collection('sessions').findOne({ 
                        _id: new ObjectId(holiday.session) 
                    });
                    holiday.session = session || { name: 'Unknown Session' };
                } catch (sessionError) {
                    console.error('Error fetching session:', sessionError);
                    holiday.session = { name: 'Unknown Session' };
                }
            }

            res.json({
                success: true,
                data: holiday,
                message: 'Holiday fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching holiday:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while fetching holiday'
            });
        }
    });

    // Create new holiday
    router.post('/', async (req, res) => {
        try {
            const { name, session, dates } = req.body;

            // Validation
            if (!name || !session || !dates || !Array.isArray(dates) || dates.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, session, and at least one date range are required'
                });
            }

            // Validate session ID
            if (!ObjectId.isValid(session)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid session ID'
                });
            }

            // Check if session exists
            const sessionExists = await req.app.locals.db.collection('sessions').findOne({ 
                _id: new ObjectId(session) 
            });
            
            if (!sessionExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Session not found'
                });
            }

            // Validate each date range
            for (let dateRange of dates) {
                if (!dateRange.fromDate || !dateRange.toDate) {
                    return res.status(400).json({
                        success: false,
                        message: 'Each date range must have fromDate and toDate'
                    });
                }

                if (new Date(dateRange.fromDate) > new Date(dateRange.toDate)) {
                    return res.status(400).json({
                        success: false,
                        message: 'From date cannot be after to date'
                    });
                }
            }

            const newHoliday = {
                name,
                session: new ObjectId(session),
                dates: dates.map(date => ({
                    fromDate: new Date(date.fromDate),
                    toDate: new Date(date.toDate),
                    isFullDay: date.isFullDay !== undefined ? date.isFullDay : true
                })),
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await holidaysCollection.insertOne(newHoliday);
            const savedHoliday = { ...newHoliday, _id: result.insertedId };

            // Populate session for response
            savedHoliday.session = sessionExists;

            res.status(201).json({
                success: true,
                data: savedHoliday,
                message: 'Holiday created successfully'
            });
        } catch (error) {
            console.error('Error creating holiday:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while creating holiday'
            });
        }
    });

    // Update holiday
    router.put('/:id', async (req, res) => {
        try {
            const { name, session, dates } = req.body;

            if (!ObjectId.isValid(req.params.id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid holiday ID'
                });
            }

            // Validation
            if (!name || !session || !dates || !Array.isArray(dates) || dates.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, session, and at least one date range are required'
                });
            }

            // Validate session ID
            if (!ObjectId.isValid(session)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid session ID'
                });
            }

            // Check if session exists
            const sessionExists = await req.app.locals.db.collection('sessions').findOne({ 
                _id: new ObjectId(session) 
            });
            
            if (!sessionExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Session not found'
                });
            }

            const updatedHoliday = {
                name,
                session: new ObjectId(session),
                dates: dates.map(date => ({
                    fromDate: new Date(date.fromDate),
                    toDate: new Date(date.toDate),
                    isFullDay: date.isFullDay !== undefined ? date.isFullDay : true
                })),
                updatedAt: new Date()
            };

            const result = await holidaysCollection.findOneAndUpdate(
                { _id: new ObjectId(req.params.id) },
                { $set: updatedHoliday },
                { returnDocument: 'after' }
            );

            if (!result.value) {
                return res.status(404).json({
                    success: false,
                    message: 'Holiday not found'
                });
            }

            // Populate session for response
            result.value.session = sessionExists;

            res.json({
                success: true,
                data: result.value,
                message: 'Holiday updated successfully'
            });
        } catch (error) {
            console.error('Error updating holiday:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while updating holiday'
            });
        }
    });

    // Delete holiday (soft delete)
    router.delete('/:id', async (req, res) => {
        try {
            if (!ObjectId.isValid(req.params.id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid holiday ID'
                });
            }

            const result = await holidaysCollection.findOneAndUpdate(
                { _id: new ObjectId(req.params.id) },
                { $set: { isActive: false, updatedAt: new Date() } },
                { returnDocument: 'after' }
            );

            if (!result.value) {
                return res.status(404).json({
                    success: false,
                    message: 'Holiday not found'
                });
            }

            res.json({
                success: true,
                message: 'Holiday deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting holiday:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while deleting holiday'
            });
        }
    });

    // Check if date is holiday
    router.get('/check/:date', async (req, res) => {
        try {
            const checkDate = new Date(req.params.date);
            
            const holiday = await holidaysCollection.findOne({
                isActive: true,
                dates: {
                    $elemMatch: {
                        fromDate: { $lte: checkDate },
                        toDate: { $gte: checkDate }
                    }
                }
            });

            if (holiday) {
                // Populate session data
                if (holiday.session && ObjectId.isValid(holiday.session)) {
                    try {
                        const session = await req.app.locals.db.collection('sessions').findOne({ 
                            _id: new ObjectId(holiday.session) 
                        });
                        holiday.session = session || { name: 'Unknown Session' };
                    } catch (sessionError) {
                        console.error('Error fetching session:', sessionError);
                        holiday.session = { name: 'Unknown Session' };
                    }
                }
            }

            res.json({
                success: true,
                data: holiday ? {
                    isHoliday: true,
                    holiday: holiday
                } : {
                    isHoliday: false
                },
                message: holiday ? 'Date is a holiday' : 'Date is not a holiday'
            });
        } catch (error) {
            console.error('Error checking holiday:', error);
            res.status(500).json({
                success: false,
                message: 'Server error while checking holiday'
            });
        }
    });

    return router;
};