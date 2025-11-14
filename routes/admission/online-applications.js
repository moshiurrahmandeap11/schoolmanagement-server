const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const upload = require('../../middleware/upload');

module.exports = (onlineApplicationsCollection) => {
    
    // POST create new admission application
    router.post('/', (req, res) => {
        upload.single('image')(req, res, async (err) => {
            // Handle multer errors
            if (err) {
                console.error('Multer error:', err);
                return res.status(400).json({
                    success: false,
                    message: err.message || 'ফাইল আপলোড করতে সমস্যা হয়েছে'
                });
            }

            try {
                const {
                    studentName,
                    fatherName,
                    motherName,
                    parentNID,
                    birthRegistrationNo,
                    gender,
                    dateOfBirth,
                    parentMobile,
                    studentMobile,
                    sessionId,
                    sessionName,
                    classId,
                    className,
                    sectionId,
                    sectionName,
                    address,
                    city,
                    postOffice,
                    country,
                    previousInstitute,
                    previousResult,
                    status = 'submitted'
                } = req.body;

                // Validation
                if (!studentName || !studentName.trim()) {
                    return res.status(400).json({
                        success: false,
                        message: 'ছাত্রের নাম প্রয়োজন'
                    });
                }

                if (!fatherName || !fatherName.trim()) {
                    return res.status(400).json({
                        success: false,
                        message: 'পিতার নাম প্রয়োজন'
                    });
                }

                if (!parentMobile) {
                    return res.status(400).json({
                        success: false,
                        message: 'প্যারেন্ট মোবাইল নম্বর প্রয়োজন'
                    });
                }

                // Mobile validation
                const mobileRegex = /^(?:\+88|01)?\d{9,11}$/;
                if (!mobileRegex.test(parentMobile)) {
                    return res.status(400).json({
                        success: false,
                        message: 'সঠিক প্যারেন্ট মোবাইল নম্বর দিন'
                    });
                }

                if (studentMobile && !mobileRegex.test(studentMobile)) {
                    return res.status(400).json({
                        success: false,
                        message: 'সঠিক শিক্ষার্থীর মোবাইল নম্বর দিন'
                    });
                }

                if (!sessionId || !sessionName) {
                    return res.status(400).json({
                        success: false,
                        message: 'সেশন নির্বাচন প্রয়োজন'
                    });
                }

                if (!classId || !className) {
                    return res.status(400).json({
                        success: false,
                        message: 'ক্লাস নির্বাচন প্রয়োজন'
                    });
                }

                if (!address || !address.trim()) {
                    return res.status(400).json({
                        success: false,
                        message: 'ঠিকানা প্রয়োজন'
                    });
                }

                // Date validation
                if (dateOfBirth) {
                    const dob = new Date(dateOfBirth);
                    const today = new Date();
                    const minAge = new Date();
                    minAge.setFullYear(today.getFullYear() - 25); // Maximum 25 years old
                    const maxAge = new Date();
                    maxAge.setFullYear(today.getFullYear() - 4); // Minimum 4 years old

                    if (dob > maxAge) {
                        return res.status(400).json({
                            success: false,
                            message: 'বয়স কমপক্ষে ৪ বছর হতে হবে'
                        });
                    }

                    if (dob < minAge) {
                        return res.status(400).json({
                            success: false,
                            message: 'বয়স সর্বোচ্চ ২৫ বছর হতে পারে'
                        });
                    }
                }

                const applicationData = {
                    // Personal Information
                    studentName: studentName.trim(),
                    fatherName: fatherName.trim(),
                    motherName: motherName?.trim() || '',
                    parentNID: parentNID?.trim() || '',
                    birthRegistrationNo: birthRegistrationNo?.trim() || '',
                    gender: gender || '',
                    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                    parentMobile: parentMobile.trim(),
                    studentMobile: studentMobile?.trim() || '',

                    // Academic Information
                    sessionId: sessionId.trim(),
                    sessionName: sessionName.trim(),
                    classId: classId.trim(),
                    className: className.trim(),
                    sectionId: sectionId?.trim() || null,
                    sectionName: sectionName?.trim() || null,

                    // Address Information
                    address: address.trim(),
                    city: city?.trim() || '',
                    postOffice: postOffice?.trim() || '',
                    country: country?.trim() || 'Bangladesh',

                    // Previous Education
                    previousInstitute: previousInstitute?.trim() || '',
                    previousResult: previousResult?.trim() || '',

                    // Image
                    image: req.file ? `/uploads/${req.file.filename}` : null,

                    // System Fields
                    status: status,
                    applicationNo: generateApplicationNo(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                console.log('Creating application with data:', {
                    ...applicationData,
                    image: req.file ? 'File uploaded' : 'No file'
                });

                const result = await onlineApplicationsCollection.insertOne(applicationData);

                res.status(201).json({
                    success: true,
                    message: 'ভর্তি ফর্ম সফলভাবে জমা দেওয়া হয়েছে',
                    data: {
                        _id: result.insertedId,
                        ...applicationData
                    }
                });
            } catch (error) {
                console.error('Error creating admission application:', error);
                res.status(500).json({
                    success: false,
                    message: 'ভর্তি ফর্ম জমা দিতে সমস্যা হয়েছে'
                });
            }
        });
    });

    // GET all admission applications (for admin)
    router.get('/', async (req, res) => {
        try {
            const applications = await onlineApplicationsCollection.find({})
                .sort({ createdAt: -1 })
                .toArray();
                
            res.status(200).json({
                success: true,
                data: applications
            });
        } catch (error) {
            console.error('Error fetching admission applications:', error);
            res.status(500).json({
                success: false,
                message: 'ভর্তি ফর্ম লোড করতে সমস্যা হয়েছে'
            });
        }
    });

    // GET single admission application by ID
    router.get('/:id', async (req, res) => {
        try {
            const application = await onlineApplicationsCollection.findOne({ 
                _id: new ObjectId(req.params.id) 
            });
            
            if (!application) {
                return res.status(404).json({
                    success: false,
                    message: 'ভর্তি ফর্ম পাওয়া যায়নি'
                });
            }
            
            res.status(200).json({
                success: true,
                data: application
            });
        } catch (error) {
            console.error('Error fetching admission application:', error);
            res.status(500).json({
                success: false,
                message: 'ভর্তি ফর্ম লোড করতে সমস্যা হয়েছে'
            });
        }
    });

    // PUT update admission application
    router.put('/:id', (req, res) => {
        upload.single('image')(req, res, async (err) => {
            // Handle multer errors
            if (err) {
                console.error('Multer error:', err);
                return res.status(400).json({
                    success: false,
                    message: err.message || 'ফাইল আপলোড করতে সমস্যা হয়েছে'
                });
            }

            try {
                const {
                    studentName,
                    fatherName,
                    motherName,
                    parentNID,
                    birthRegistrationNo,
                    gender,
                    dateOfBirth,
                    parentMobile,
                    studentMobile,
                    sessionId,
                    sessionName,
                    classId,
                    className,
                    sectionId,
                    sectionName,
                    address,
                    city,
                    postOffice,
                    country,
                    previousInstitute,
                    previousResult,
                    status
                } = req.body;

                // Validation
                if (!studentName || !studentName.trim()) {
                    return res.status(400).json({
                        success: false,
                        message: 'ছাত্রের নাম প্রয়োজন'
                    });
                }

                if (!fatherName || !fatherName.trim()) {
                    return res.status(400).json({
                        success: false,
                        message: 'পিতার নাম প্রয়োজন'
                    });
                }

                if (!parentMobile) {
                    return res.status(400).json({
                        success: false,
                        message: 'প্যারেন্ট মোবাইল নম্বর প্রয়োজন'
                    });
                }

                // Mobile validation
                const mobileRegex = /^(?:\+88|01)?\d{9,11}$/;
                if (!mobileRegex.test(parentMobile)) {
                    return res.status(400).json({
                        success: false,
                        message: 'সঠিক প্যারেন্ট মোবাইল নম্বর দিন'
                    });
                }

                if (studentMobile && !mobileRegex.test(studentMobile)) {
                    return res.status(400).json({
                        success: false,
                        message: 'সঠিক শিক্ষার্থীর মোবাইল নম্বর দিন'
                    });
                }

                if (!sessionId || !sessionName) {
                    return res.status(400).json({
                        success: false,
                        message: 'সেশন নির্বাচন প্রয়োজন'
                    });
                }

                if (!classId || !className) {
                    return res.status(400).json({
                        success: false,
                        message: 'ক্লাস নির্বাচন প্রয়োজন'
                    });
                }

                if (!address || !address.trim()) {
                    return res.status(400).json({
                        success: false,
                        message: 'ঠিকানা প্রয়োজন'
                    });
                }

                const updateData = {
                    // Personal Information
                    studentName: studentName.trim(),
                    fatherName: fatherName.trim(),
                    motherName: motherName?.trim() || '',
                    parentNID: parentNID?.trim() || '',
                    birthRegistrationNo: birthRegistrationNo?.trim() || '',
                    gender: gender || '',
                    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                    parentMobile: parentMobile.trim(),
                    studentMobile: studentMobile?.trim() || '',

                    // Academic Information
                    sessionId: sessionId.trim(),
                    sessionName: sessionName.trim(),
                    classId: classId.trim(),
                    className: className.trim(),
                    sectionId: sectionId?.trim() || null,
                    sectionName: sectionName?.trim() || null,

                    // Address Information
                    address: address.trim(),
                    city: city?.trim() || '',
                    postOffice: postOffice?.trim() || '',
                    country: country?.trim() || 'Bangladesh',

                    // Previous Education
                    previousInstitute: previousInstitute?.trim() || '',
                    previousResult: previousResult?.trim() || '',

                    // Status
                    status: status,
                    updatedAt: new Date()
                };

                // If new image uploaded, update it
                if (req.file) {
                    updateData.image = `/uploads/${req.file.filename}`;
                }

                const result = await onlineApplicationsCollection.updateOne(
                    { _id: new ObjectId(req.params.id) },
                    { $set: updateData }
                );

                if (result.matchedCount === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'ভর্তি ফর্ম পাওয়া যায়নি'
                    });
                }

                res.status(200).json({
                    success: true,
                    message: 'ভর্তি ফর্ম সফলভাবে আপডেট হয়েছে'
                });
            } catch (error) {
                console.error('Error updating admission application:', error);
                res.status(500).json({
                    success: false,
                    message: 'ভর্তি ফর্ম আপডেট করতে সমস্যা হয়েছে'
                });
            }
        });
    });

    // Helper function to generate application number
    function generateApplicationNo() {
        const timestamp = Date.now().toString();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `APP-${timestamp.slice(-6)}-${random}`;
    }

    return router;
};