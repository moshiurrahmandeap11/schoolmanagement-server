const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (holidayCollection) => {
    
    // Get all holidays
    router.get('/', async (req, res) => {
        try {
            const holidays = await holidayCollection.find({}).sort({ date: 1 }).toArray();
            res.json({
                success: true,
                data: holidays
            });
        } catch (error) {
            console.error('Error fetching holidays:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch holidays'
            });
        }
    });

    // Add new holiday
    router.post('/', async (req, res) => {
        try {
            const holiday = req.body;
            
            // Validate required fields
            if (!holiday.title || !holiday.date) {
                return res.status(400).json({
                    success: false,
                    message: 'Title and date are required'
                });
            }

            // Check if holiday already exists for the same date
            const existingHoliday = await holidayCollection.findOne({ 
                date: holiday.date 
            });

            if (existingHoliday) {
                return res.status(400).json({
                    success: false,
                    message: 'Holiday already exists for this date'
                });
            }

            // Add timestamps
            holiday.createdAt = new Date();
            holiday.updatedAt = new Date();

            const result = await holidayCollection.insertOne(holiday);
            
            res.json({
                success: true,
                message: 'Holiday added successfully',
                data: { insertedId: result.insertedId }
            });
        } catch (error) {
            console.error('Error adding holiday:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add holiday'
            });
        }
    });

    // Update holiday
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = req.body;
            updateData.updatedAt = new Date();

            const result = await holidayCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Holiday not found'
                });
            }

            res.json({
                success: true,
                message: 'Holiday updated successfully'
            });
        } catch (error) {
            console.error('Error updating holiday:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update holiday'
            });
        }
    });

    // Delete holiday
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const result = await holidayCollection.deleteOne({ 
                _id: new ObjectId(id) 
            });

            if (result.deletedCount === 0) {
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
                message: 'Failed to delete holiday'
            });
        }
    });

    // Add multiple preloaded Bangladesh government holidays
    router.post('/preload-bd-holidays', async (req, res) => {
        try {
            const currentYear = new Date().getFullYear();
            
            const bdHolidays = [
                // National Holidays
                {
                    title: 'International Mother Language Day (শহীদ দিবস)',
                    date: `${currentYear}-02-21`,
                    type: 'national',
                    description: 'Language Movement Day - Ekushey February',
                    isRecurring: true,
                    isGovernmentHoliday: true
                },
                {
                    title: 'Independence Day (স্বাধীনতা দিবস)',
                    date: `${currentYear}-03-26`,
                    type: 'national',
                    description: 'Bangladesh Independence Day',
                    isRecurring: true,
                    isGovernmentHoliday: true
                },
                {
                    title: 'Bengali New Year (পহেলা বৈশাখ)',
                    date: `${currentYear}-04-14`,
                    type: 'cultural',
                    description: 'Pohela Boishakh - Bengali New Year',
                    isRecurring: true,
                    isGovernmentHoliday: true
                },
                {
                    title: 'May Day (মে দিবস)',
                    date: `${currentYear}-05-01`,
                    type: 'international',
                    description: 'International Workers Day',
                    isRecurring: true,
                    isGovernmentHoliday: true
                },
                {
                    title: 'National Mourning Day (জাতীয় শোক দিবস)',
                    date: `${currentYear}-08-15`,
                    type: 'national',
                    description: 'Martyred of Father of the Nation Bangabandhu Sheikh Mujibur Rahman',
                    isRecurring: true,
                    isGovernmentHoliday: true
                },
                {
                    title: 'Victory Day (বিজয় দিবস)',
                    date: `${currentYear}-12-16`,
                    type: 'national',
                    description: 'Victory Day of Bangladesh',
                    isRecurring: true,
                    isGovernmentHoliday: true
                },

                // Religious Holidays (approximate dates - should be calculated based on lunar calendar)
                {
                    title: 'Eid-ul-Fitr (ঈদ-উল-ফিতর)',
                    date: `${currentYear}-04-10`, // Approximate date
                    type: 'religious',
                    description: 'Eid-ul-Fitr - After Ramadan',
                    isRecurring: true,
                    isGovernmentHoliday: true,
                    duration: 3
                },
                {
                    title: 'Eid-ul-Adha (ঈদ-উল-আজহা)',
                    date: `${currentYear}-06-16`, // Approximate date
                    type: 'religious',
                    description: 'Eid-ul-Adha - Festival of Sacrifice',
                    isRecurring: true,
                    isGovernmentHoliday: true,
                    duration: 3
                },
                {
                    title: 'Durga Puja (দুর্গা পূজা)',
                    date: `${currentYear}-10-12`, // Approximate date
                    type: 'religious',
                    description: 'Durga Puja - Hindu festival',
                    isRecurring: true,
                    isGovernmentHoliday: true,
                    duration: 3
                },
                {
                    title: 'Christmas (বড়দিন)',
                    date: `${currentYear}-12-25`,
                    type: 'religious',
                    description: 'Christmas Day',
                    isRecurring: true,
                    isGovernmentHoliday: true
                }
            ];

            // Remove existing preloaded holidays for current year
            await holidayCollection.deleteMany({ 
                isGovernmentHoliday: true,
                date: { $regex: `^${currentYear}` }
            });

            // Add timestamps
            const holidaysWithTimestamps = bdHolidays.map(holiday => ({
                ...holiday,
                createdAt: new Date(),
                updatedAt: new Date(),
                isPreloaded: true
            }));

            const result = await holidayCollection.insertMany(holidaysWithTimestamps);

            res.json({
                success: true,
                message: 'Bangladesh government holidays preloaded successfully',
                data: { insertedCount: result.insertedCount }
            });
        } catch (error) {
            console.error('Error preloading holidays:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to preload holidays'
            });
        }
    });

    // Get holidays by month
    router.get('/month/:year/:month', async (req, res) => {
        try {
            const { year, month } = req.params;
            const startDate = `${year}-${month.padStart(2, '0')}-01`;
            const endDate = `${year}-${month.padStart(2, '0')}-31`;

            const holidays = await holidayCollection.find({
                date: { $gte: startDate, $lte: endDate }
            }).sort({ date: 1 }).toArray();

            res.json({
                success: true,
                data: holidays
            });
        } catch (error) {
            console.error('Error fetching monthly holidays:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch monthly holidays'
            });
        }
    });

    return router;
};