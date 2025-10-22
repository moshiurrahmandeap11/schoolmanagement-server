const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const upload = require('../middleware/upload');
const fs = require('fs');
const path = require('path');

module.exports = (studentsCollection, classesCollection) => {

    // GET all students
    router.get('/', async (req, res) => {
        try {
            const students = await studentsCollection.find().sort({ class: 1, roll: 1 }).toArray();
            res.json({
                success: true,
                data: students
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ছাত্র-ছাত্রীদের তথ্য লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // GET students by class
    router.get('/class/:className', async (req, res) => {
        try {
            const students = await studentsCollection.find({ 
                class: req.params.className 
            }).sort({ roll: 1 }).toArray();
            
            res.json({
                success: true,
                data: students
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ছাত্র-ছাত্রীদের তথ্য লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // GET single student by ID
    router.get('/:id', async (req, res) => {
        try {
            const student = await studentsCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });
            
            if (!student) {
                return res.status(404).json({
                    success: false,
                    message: 'ছাত্র-ছাত্রী পাওয়া যায়নি'
                });
            }

            res.json({
                success: true,
                data: student
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ছাত্র-ছাত্রীর তথ্য লোড করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // CREATE new student
    router.post('/', upload.single('photo'), async (req, res) => {
        try {
            const { 
                name, 
                class: studentClass, 
                roll, 
                section, 
                fathersName, 
                mothersName, 
                bio, 
                location, 
                phoneNumber, 
                fathersPhone, 
                mothersPhone 
            } = req.body;

            // Validation
            if (!name || !studentClass || !roll || !section) {
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(400).json({
                    success: false,
                    message: 'নাম, ক্লাস, রোল এবং সেকশন আবশ্যক'
                });
            }

            // Check if student already exists in same class with same roll
            const existingStudent = await studentsCollection.findOne({ 
                class: studentClass, 
                roll: parseInt(roll) 
            });

            if (existingStudent) {
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(400).json({
                    success: false,
                    message: 'এই ক্লাসে এই রোল নম্বরের ছাত্র-ছাত্রী ইতিমধ্যে বিদ্যমান'
                });
            }

            const newStudent = {
                name,
                class: studentClass,
                roll: parseInt(roll),
                section,
                fathersName: fathersName || '',
                mothersName: mothersName || '',
                bio: bio || '',
                location: location || '',
                phoneNumber: phoneNumber || '',
                fathersPhone: fathersPhone || '',
                mothersPhone: mothersPhone || '',
                photo: req.file ? `/uploads/${req.file.filename}` : '',
                status: 'active',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await studentsCollection.insertOne(newStudent);
            
            res.status(201).json({
                success: true,
                message: 'ছাত্র-ছাত্রী সফলভাবে তৈরি হয়েছে',
                data: {
                    _id: result.insertedId,
                    ...newStudent
                }
            });
        } catch (error) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            res.status(500).json({
                success: false,
                message: 'ছাত্র-ছাত্রী তৈরি করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // UPDATE student
    router.put('/:id', upload.single('photo'), async (req, res) => {
        try {
            const { 
                name, 
                class: studentClass, 
                roll, 
                section, 
                fathersName, 
                mothersName, 
                bio, 
                location, 
                phoneNumber, 
                fathersPhone, 
                mothersPhone,
                status 
            } = req.body;

            // Check if student exists
            const existingStudent = await studentsCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!existingStudent) {
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(404).json({
                    success: false,
                    message: 'ছাত্র-ছাত্রী পাওয়া যায়নি'
                });
            }

            const updateData = {
                updatedAt: new Date()
            };

            if (name) updateData.name = name;
            if (studentClass) updateData.class = studentClass;
            if (roll) updateData.roll = parseInt(roll);
            if (section) updateData.section = section;
            if (fathersName !== undefined) updateData.fathersName = fathersName;
            if (mothersName !== undefined) updateData.mothersName = mothersName;
            if (bio !== undefined) updateData.bio = bio;
            if (location !== undefined) updateData.location = location;
            if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
            if (fathersPhone !== undefined) updateData.fathersPhone = fathersPhone;
            if (mothersPhone !== undefined) updateData.mothersPhone = mothersPhone;
            if (status) updateData.status = status;

            // Handle photo update
            if (req.file) {
                // Delete old photo if exists
                if (existingStudent.photo) {
                    const oldPhotoPath = path.join(__dirname, '..', existingStudent.photo);
                    if (fs.existsSync(oldPhotoPath)) {
                        fs.unlinkSync(oldPhotoPath);
                    }
                }
                updateData.photo = `/uploads/${req.file.filename}`;
            }

            const result = await studentsCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: updateData }
            );

            res.json({
                success: true,
                message: 'ছাত্র-ছাত্রীর তথ্য সফলভাবে আপডেট হয়েছে',
                data: {
                    _id: req.params.id,
                    ...updateData
                }
            });
        } catch (error) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            res.status(500).json({
                success: false,
                message: 'ছাত্র-ছাত্রীর তথ্য আপডেট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // PROMOTE student to next class
    router.put('/:id/promote', async (req, res) => {
        try {
            const { newRoll, status } = req.body;

            const student = await studentsCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!student) {
                return res.status(404).json({
                    success: false,
                    message: 'ছাত্র-ছাত্রী পাওয়া যায়নি'
                });
            }

            // Get current class number and increment
            const currentClass = student.class;
            const classNumber = parseInt(currentClass.replace(/\D/g, ''));
            const nextClass = `Class ${classNumber + 1}`;

            const updateData = {
                class: nextClass,
                roll: parseInt(newRoll),
                status: status || 'active',
                promotedAt: new Date(),
                updatedAt: new Date()
            };

            await studentsCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: updateData }
            );

            res.json({
                success: true,
                message: 'ছাত্র-ছাত্রী সফলভাবে প্রমোট করা হয়েছে',
                data: {
                    _id: req.params.id,
                    ...updateData
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ছাত্র-ছাত্রী প্রমোট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    // DELETE student
    router.delete('/:id', async (req, res) => {
        try {
            const student = await studentsCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });

            if (!student) {
                return res.status(404).json({
                    success: false,
                    message: 'ছাত্র-ছাত্রী পাওয়া যায়নি'
                });
            }

            // Delete photo file if exists
            if (student.photo) {
                const photoPath = path.join(__dirname, '..', student.photo);
                if (fs.existsSync(photoPath)) {
                    fs.unlinkSync(photoPath);
                }
            }

            await studentsCollection.deleteOne({ 
                _id: new ObjectId(req.params.id) 
            });

            res.json({
                success: true,
                message: 'ছাত্র-ছাত্রী সফলভাবে ডিলিট হয়েছে'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ছাত্র-ছাত্রী ডিলিট করতে সমস্যা হয়েছে',
                error: error.message
            });
        }
    });

    return router;
};