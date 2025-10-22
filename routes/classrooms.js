const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

module.exports = (classRoomsCollection) => {

    // GET all classrooms
    router.get('/', async (req, res) => {
        try {
            const classrooms = await classRoomsCollection.find({}).sort({ floor: 1, roomNumber: 1 }).toArray();
            res.json({
                success: true,
                data: classrooms,
                message: 'Classrooms retrieved successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching classrooms',
                error: error.message
            });
        }
    });

    // GET classroom by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid classroom ID'
                });
            }

            const classroom = await classRoomsCollection.findOne({ _id: new ObjectId(id) });
            
            if (!classroom) {
                return res.status(404).json({
                    success: false,
                    message: 'Classroom not found'
                });
            }

            res.json({
                success: true,
                data: classroom,
                message: 'Classroom retrieved successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching classroom',
                error: error.message
            });
        }
    });

    // GET classrooms by floor
    router.get('/floor/:floor', async (req, res) => {
        try {
            const { floor } = req.params;
            const classrooms = await classRoomsCollection.find({ floor: parseInt(floor) }).sort({ roomNumber: 1 }).toArray();
            
            res.json({
                success: true,
                data: classrooms,
                message: `Classrooms on floor ${floor} retrieved successfully`
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching classrooms by floor',
                error: error.message
            });
        }
    });

    // CREATE new classroom
    router.post('/', async (req, res) => {
        try {
            const { 
                roomNumber, 
                roomName, 
                floor, 
                capacity, 
                facilities, 
                roomType, 
                status, 
                description 
            } = req.body;

            // Validation
            if (!roomNumber || !roomName || !floor || !capacity) {
                return res.status(400).json({
                    success: false,
                    message: 'Room number, room name, floor and capacity are required'
                });
            }

            // Check if room number already exists
            const existingRoom = await classRoomsCollection.findOne({ 
                roomNumber: roomNumber.toString().toUpperCase()
            });

            if (existingRoom) {
                return res.status(400).json({
                    success: false,
                    message: 'Room number already exists'
                });
            }

            const newClassroom = {
                roomNumber: roomNumber.toString().toUpperCase(),
                roomName,
                floor: parseInt(floor),
                capacity: parseInt(capacity),
                facilities: facilities || [],
                roomType: roomType || 'Classroom',
                status: status || 'Available',
                description: description || '',
                currentUsage: 0,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await classRoomsCollection.insertOne(newClassroom);

            res.status(201).json({
                success: true,
                data: { ...newClassroom, _id: result.insertedId },
                message: 'Classroom added successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error adding classroom',
                error: error.message
            });
        }
    });

    // UPDATE classroom
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { 
                roomNumber, 
                roomName, 
                floor, 
                capacity, 
                facilities, 
                roomType, 
                status, 
                description 
            } = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid classroom ID'
                });
            }

            const existingClassroom = await classRoomsCollection.findOne({ _id: new ObjectId(id) });
            if (!existingClassroom) {
                return res.status(404).json({
                    success: false,
                    message: 'Classroom not found'
                });
            }

            // Check if room number is being changed and if it already exists
            if (roomNumber && roomNumber !== existingClassroom.roomNumber) {
                const roomWithSameNumber = await classRoomsCollection.findOne({ 
                    roomNumber: roomNumber.toString().toUpperCase(),
                    _id: { $ne: new ObjectId(id) }
                });

                if (roomWithSameNumber) {
                    return res.status(400).json({
                        success: false,
                        message: 'Room number already exists'
                    });
                }
            }

            const updateData = {
                updatedAt: new Date()
            };

            if (roomNumber) updateData.roomNumber = roomNumber.toString().toUpperCase();
            if (roomName) updateData.roomName = roomName;
            if (floor) updateData.floor = parseInt(floor);
            if (capacity) updateData.capacity = parseInt(capacity);
            if (facilities) updateData.facilities = facilities;
            if (roomType) updateData.roomType = roomType;
            if (status) updateData.status = status;
            if (description !== undefined) updateData.description = description;

            const result = await classRoomsCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.modifiedCount === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No changes made'
                });
            }

            const updatedClassroom = await classRoomsCollection.findOne({ _id: new ObjectId(id) });

            res.json({
                success: true,
                data: updatedClassroom,
                message: 'Classroom updated successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error updating classroom',
                error: error.message
            });
        }
    });

    // UPDATE classroom usage
    router.patch('/:id/usage', async (req, res) => {
        try {
            const { id } = req.params;
            const { usage } = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid classroom ID'
                });
            }

            const existingClassroom = await classRoomsCollection.findOne({ _id: new ObjectId(id) });
            if (!existingClassroom) {
                return res.status(404).json({
                    success: false,
                    message: 'Classroom not found'
                });
            }

            const newUsage = parseInt(usage);
            if (newUsage > existingClassroom.capacity) {
                return res.status(400).json({
                    success: false,
                    message: 'Usage cannot exceed capacity'
                });
            }

            const updateData = {
                currentUsage: newUsage,
                updatedAt: new Date()
            };

            await classRoomsCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            const updatedClassroom = await classRoomsCollection.findOne({ _id: new ObjectId(id) });

            res.json({
                success: true,
                data: updatedClassroom,
                message: 'Classroom usage updated successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error updating classroom usage',
                error: error.message
            });
        }
    });

    // DELETE classroom
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid classroom ID'
                });
            }

            const result = await classRoomsCollection.deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Classroom not found'
                });
            }

            res.json({
                success: true,
                message: 'Classroom deleted successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error deleting classroom',
                error: error.message
            });
        }
    });

    // GET classroom statistics
    router.get('/stats/summary', async (req, res) => {
        try {
            const classrooms = await classRoomsCollection.find({}).toArray();
            
            const stats = {
                totalClassrooms: classrooms.length,
                totalCapacity: classrooms.reduce((sum, room) => sum + room.capacity, 0),
                totalUsage: classrooms.reduce((sum, room) => sum + room.currentUsage, 0),
                availableRooms: classrooms.filter(room => room.status === 'Available').length,
                occupiedRooms: classrooms.filter(room => room.status === 'Occupied').length,
                maintenanceRooms: classrooms.filter(room => room.status === 'Maintenance').length,
                floorWise: classrooms.reduce((acc, room) => {
                    const floor = room.floor;
                    if (!acc[floor]) {
                        acc[floor] = {
                            floor: floor,
                            totalRooms: 0,
                            totalCapacity: 0,
                            totalUsage: 0
                        };
                    }
                    acc[floor].totalRooms++;
                    acc[floor].totalCapacity += room.capacity;
                    acc[floor].totalUsage += room.currentUsage;
                    return acc;
                }, {})
            };

            res.json({
                success: true,
                data: stats,
                message: 'Classroom statistics retrieved successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching classroom statistics',
                error: error.message
            });
        }
    });

    return router;
};