// routes/certificate.js
const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

module.exports = (db) => {
  const instantFormCollection = db.collection('instantFormCollection');
  const certificateCollection = db.collection('certificateCollection');
  const certificateCategoryCollection = db.collection('certificateCategoryCollection');
  const instituteFormsCollection = db.collection('instituteFormsCollection');

  // Configure multer for multiple file uploads
  const instituteUpload = upload.fields([
    { name: 'previewImage', maxCount: 1 },
    { name: 'headerImage', maxCount: 1 },
    { name: 'backgroundImage', maxCount: 1 }
  ]);

  // CREATE - নতুন ফর্ম
  router.post('/instant-form', async (req, res) => {
    try {
      const data = {
        studentId: req.body.studentId?.trim() || '',
        name: req.body.name?.trim() || '',
        birthDate: req.body.birthDate || '',
        gender: req.body.gender || 'Other',
        mobile: req.body.mobile?.trim() || '',
        bloodGroup: req.body.bloodGroup || '',
        fatherName: req.body.fatherName?.trim() || '',
        motherName: req.body.motherName?.trim() || '',
        guardianName: req.body.guardianName?.trim() || '',
        parentMobile: req.body.parentMobile?.trim() || '',
        rollNumber: req.body.rollNumber?.trim() || '',
        className: req.body.className?.trim() || '',
        batch: req.body.batch?.trim() || '',
        section: req.body.section?.trim() || '',
        session: req.body.session?.trim() || '',
        address: req.body.address?.trim() || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await instantFormCollection.insertOne(data);
      res.status(201).json({
        success: true,
        message: 'ফর্ম সফলভাবে সংরক্ষণ হয়েছে',
        data: { _id: result.insertedId, ...data }
      });
    } catch (error) {
      console.error('Create Error:', error);
      res.status(500).json({ success: false, message: 'সংরক্ষণে সমস্যা' });
    }
  });

  // READ ALL instant forms
  router.get('/instant-form', async (req, res) => {
    try {
      const forms = await instantFormCollection
        .find()
        .sort({ createdAt: -1 })
        .toArray();
      res.json({ success: true, count: forms.length, data: forms });
    } catch (error) {
      res.status(500).json({ success: false, message: 'লোড করতে সমস্যা' });
    }
  });

  // READ SINGLE instant form
  router.get('/instant-form/:id', async (req, res) => {
    try {
      if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ success: false, message: 'অবৈধ আইডি' });
      }
      const form = await instantFormCollection.findOne({ _id: new ObjectId(req.params.id) });
      if (!form) return res.status(404).json({ success: false, message: 'পাওয়া যায়নি' });
      res.json({ success: true, data: form });
    } catch (error) {
      res.status(500).json({ success: false, message: 'লোড করতে সমস্যা' });
    }
  });

  // UPDATE instant form
  router.put('/instant-form/:id', async (req, res) => {
    try {
      if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ success: false, message: 'অবৈধ আইডি' });
      }
      const updateData = { ...req.body, updatedAt: new Date() };
      const result = await instantFormCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: updateData }
      );
      if (result.matchedCount === 0) {
        return res.status(404).json({ success: false, message: 'পাওয়া যায়নি' });
      }
      res.json({ success: true, message: 'আপডেট হয়েছে' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'আপডেটে সমস্যা' });
    }
  });

  // DELETE instant form
  router.delete('/instant-form/:id', async (req, res) => {
    try {
      if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ success: false, message: 'অবৈধ আইডি' });
      }
      const result = await instantFormCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ success: false, message: 'পাওয়া যায়নি' });
      }
      res.json({ success: true, message: 'মুছে ফেলা হয়েছে' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'মুছতে সমস্যা' });
    }
  });

  // Generate Certificate
  router.post('/generate-certificate', async (req, res) => {
    try {
      const data = {
        rollNo: req.body.rollNo?.trim(),
        studentName: req.body.studentName?.trim(),
        fatherName: req.body.fatherName?.trim(),
        institute: req.body.institute?.trim() || 'আমাদের স্কুল',
        examination: req.body.examination?.trim(),
        year: req.body.year?.trim(),
        result: req.body.result?.trim(),
        dateOfBirth: req.body.dateOfBirth,
        certificateId: `CERT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        issuedAt: new Date(),
        qrCode: `https://yourschool.com/verify/${Date.now()}`
      };

      const result = await certificateCollection.insertOne(data);
      res.status(201).json({
        success: true,
        message: 'সার্টিফিকেট সফলভাবে তৈরি হয়েছে',
        data: { _id: result.insertedId, ...data }
      });
    } catch (error) {
      console.error('Certificate Error:', error);
      res.status(500).json({ success: false, message: 'সার্টিফিকেট তৈরিতে সমস্যা' });
    }
  });

  // Get all categories
  router.get('/certificate-category', async (req, res) => {
    try {
      const data = await certificateCategoryCollection.find().sort({ createdAt: -1 }).toArray();
      res.json({ success: true, data });
    } catch (err) {
      console.error('Get categories error:', err);
      res.status(500).json({ success: false, message: 'লোড করতে সমস্যা' });
    }
  });

  // Create category
  router.post('/certificate-category', async (req, res) => {
    try {
      const { name, language } = req.body;
      
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'ক্যাটাগরির নাম প্রয়োজন' });
      }

      const existingCategory = await certificateCategoryCollection.findOne({ 
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } 
      });
      
      if (existingCategory) {
        return res.status(400).json({ success: false, message: 'এই নামের ক্যাটাগরি ইতিমধ্যে আছে' });
      }

      const result = await certificateCategoryCollection.insertOne({
        name: name.trim(),
        language: language || 'Bengali',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      const newCat = await certificateCategoryCollection.findOne({ _id: result.insertedId });
      res.status(201).json({ 
        success: true, 
        message: 'ক্যাটাগরি তৈরি হয়েছে',
        data: newCat 
      });
    } catch (err) {
      console.error('Create category error:', err);
      res.status(500).json({ success: false, message: 'তৈরি করতে সমস্যা' });
    }
  });

  // Update category
  router.put('/certificate-category/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'অবৈধ আইডি' });
      }

      const { name, language } = req.body;
      
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'ক্যাটাগরির নাম প্রয়োজন' });
      }

      // Check if another category with same name exists
      const existingCategory = await certificateCategoryCollection.findOne({ 
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        _id: { $ne: new ObjectId(id) }
      });
      
      if (existingCategory) {
        return res.status(400).json({ success: false, message: 'এই নামের ক্যাটাগরি ইতিমধ্যে আছে' });
      }

      const result = await certificateCategoryCollection.updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            name: name.trim(),
            language: language || 'Bengali',
            updatedAt: new Date() 
          } 
        }
      );
      
      if (result.matchedCount === 0) {
        return res.status(404).json({ success: false, message: 'ক্যাটাগরি পাওয়া যায়নি' });
      }

      res.json({ 
        success: true, 
        message: 'ক্যাটাগরি আপডেট হয়েছে',
        data: { _id: id, ...req.body }
      });
    } catch (err) {
      console.error('Update category error:', err);
      res.status(500).json({ success: false, message: 'আপডেট করতে সমস্যা' });
    }
  });

  // Delete category
  router.delete('/certificate-category/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'অবৈধ আইডি' });
      }

      const result = await certificateCategoryCollection.deleteOne({ _id: new ObjectId(id) });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ success: false, message: 'ক্যাটাগরি পাওয়া যায়নি' });
      }
      
      res.json({ success: true, message: 'ক্যাটাগরি মুছে ফেলা হয়েছে' });
    } catch (err) {
      console.error('Delete category error:', err);
      res.status(500).json({ success: false, message: 'মুছতে সমস্যা' });
    }
  });

  // Institute Forms Routes with Image Upload

// GET all institute forms
  router.get('/institute-forms', async (req, res) => {
    try {
      console.log('Fetching institute forms...');
      const forms = await instituteFormsCollection.find().sort({ createdAt: -1 }).toArray();
      console.log(`Found ${forms.length} forms`);
      
      res.json({ 
        success: true, 
        count: forms.length, 
        data: forms 
      });
    } catch (error) {
      console.error('Get institute forms error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'ইনস্টিটিউট ফর্ম লোড করতে সমস্যা হয়েছে',
        error: error.message 
      });
    }
  });

  // CREATE new institute form with image upload
  router.post('/institute-forms', instituteUpload, async (req, res) => {
    try {
      console.log('Creating new institute form...');
      const { category, class: className, batch, section, session, details, status, language } = req.body;

      console.log('Received data:', { category, className, batch, section, session, status, language });
      console.log('Files received:', req.files);

      // Validation
      if (!category || !className || !batch) {
        return res.status(400).json({
          success: false,
          message: 'ক্যাটাগরী, ক্লাস এবং ব্যাচ আবশ্যক'
        });
      }

      const imagePaths = {};
      
      // Handle file uploads
      if (req.files) {
        if (req.files.previewImage) {
          imagePaths.previewImage = `/uploads/${req.files.previewImage[0].filename}`;
        }
        if (req.files.headerImage) {
          imagePaths.headerImage = `/uploads/${req.files.headerImage[0].filename}`;
        }
        if (req.files.backgroundImage) {
          imagePaths.backgroundImage = `/uploads/${req.files.backgroundImage[0].filename}`;
        }
      }

      const newInstituteForm = {
        category: category.trim(),
        class: className.trim(),
        batch: batch.trim(),
        section: section?.trim() || '',
        session: session?.trim() || '',
        details: details || '',
        status: status || 'Active',
        language: language || 'Bengali',
        ...imagePaths,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('Inserting form:', newInstituteForm);

      const result = await instituteFormsCollection.insertOne(newInstituteForm);
      const createdForm = await instituteFormsCollection.findOne({ _id: result.insertedId });
      
      console.log('Form created successfully:', createdForm._id);

      res.status(201).json({
        success: true,
        message: 'ইনস্টিটিউট ফর্ম সফলভাবে তৈরি হয়েছে',
        data: createdForm
      });
    } catch (error) {
      console.error('Create institute form error:', error);
      res.status(500).json({
        success: false,
        message: 'ইনস্টিটিউট ফর্ম তৈরি করতে সমস্যা হয়েছে',
        error: error.message
      });
    }
  });

  // UPDATE institute form with image upload - FIXED VERSION
  router.put('/institute-forms/:id', instituteUpload, async (req, res) => {
    try {
      const { id } = req.params;
      console.log('Updating institute form with ID:', id);
      
      // Validate ObjectId
      if (!ObjectId.isValid(id)) {
        console.error('Invalid ObjectId:', id);
        return res.status(400).json({ 
          success: false, 
          message: 'অবৈধ আইডি' 
        });
      }

      const objectId = new ObjectId(id);
      const { category, class: className, batch, section, session, details, status, language } = req.body;

      console.log('Update data received:', { 
        category, className, batch, section, session, details, status, language 
      });
      console.log('Files for update:', req.files);

      // Check if institute form exists
      const existingForm = await instituteFormsCollection.findOne({ _id: objectId });
      if (!existingForm) {
        console.error('Form not found with ID:', id);
        return res.status(404).json({ 
          success: false, 
          message: 'ইনস্টিটিউট ফর্ম পাওয়া যায়নি' 
        });
      }

      console.log('Existing form found:', existingForm);

      const updateData = {
        category: category?.trim() || existingForm.category,
        class: className?.trim() || existingForm.class,
        batch: batch?.trim() || existingForm.batch,
        section: section?.trim() || existingForm.section,
        session: session?.trim() || existingForm.session,
        details: details || existingForm.details,
        status: status || existingForm.status,
        language: language || existingForm.language,
        updatedAt: new Date()
      };

      // Handle file uploads and delete old files if new ones are uploaded
      if (req.files) {
        if (req.files.previewImage) {
          // Delete old preview image if exists
          if (existingForm.previewImage && existingForm.previewImage.startsWith('/uploads/')) {
            const oldFilename = existingForm.previewImage.replace('/uploads/', '');
            const oldImagePath = path.join(__dirname, '..', 'uploads', oldFilename);
            console.log('Deleting old preview image:', oldImagePath);
            if (fs.existsSync(oldImagePath)) {
              fs.unlinkSync(oldImagePath);
              console.log('Old preview image deleted');
            }
          }
          updateData.previewImage = `/uploads/${req.files.previewImage[0].filename}`;
          console.log('New preview image set:', updateData.previewImage);
        }

        if (req.files.headerImage) {
          // Delete old header image if exists
          if (existingForm.headerImage && existingForm.headerImage.startsWith('/uploads/')) {
            const oldFilename = existingForm.headerImage.replace('/uploads/', '');
            const oldImagePath = path.join(__dirname, '..', 'uploads', oldFilename);
            console.log('Deleting old header image:', oldImagePath);
            if (fs.existsSync(oldImagePath)) {
              fs.unlinkSync(oldImagePath);
              console.log('Old header image deleted');
            }
          }
          updateData.headerImage = `/uploads/${req.files.headerImage[0].filename}`;
          console.log('New header image set:', updateData.headerImage);
        }

        if (req.files.backgroundImage) {
          // Delete old background image if exists
          if (existingForm.backgroundImage && existingForm.backgroundImage.startsWith('/uploads/')) {
            const oldFilename = existingForm.backgroundImage.replace('/uploads/', '');
            const oldImagePath = path.join(__dirname, '..', 'uploads', oldFilename);
            console.log('Deleting old background image:', oldImagePath);
            if (fs.existsSync(oldImagePath)) {
              fs.unlinkSync(oldImagePath);
              console.log('Old background image deleted');
            }
          }
          updateData.backgroundImage = `/uploads/${req.files.backgroundImage[0].filename}`;
          console.log('New background image set:', updateData.backgroundImage);
        }
      }

      console.log('Final update data:', updateData);

      const result = await instituteFormsCollection.updateOne(
        { _id: objectId },
        { $set: updateData }
      );

      console.log('Update result:', result);

      if (result.matchedCount === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'ইনস্টিটিউট ফর্ম আপডেট করতে সমস্যা হয়েছে' 
        });
      }

      const updatedForm = await instituteFormsCollection.findOne({ _id: objectId });
      console.log('Form updated successfully:', updatedForm._id);
      
      res.json({
        success: true,
        message: 'ইনস্টিটিউট ফর্ম আপডেট হয়েছে',
        data: updatedForm
      });
    } catch (error) {
      console.error('Update institute form error:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        message: 'ইনস্টিটিউট ফর্ম আপডেট করতে সমস্যা হয়েছে',
        error: error.message
      });
    }
  });

  // DELETE institute form
  router.delete('/institute-forms/:id', async (req, res) => {
    try {
      const { id } = req.params;
      console.log('Deleting institute form with ID:', id);
      
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'অবৈধ আইডি' });
      }

      const objectId = new ObjectId(id);

      // Check if institute form exists and get image paths
      const existingForm = await instituteFormsCollection.findOne({ _id: objectId });
      if (!existingForm) {
        return res.status(404).json({ success: false, message: 'ইনস্টিটিউট ফর্ম পাওয়া যায়নি' });
      }

      // Delete associated image files
      const imageFields = ['previewImage', 'headerImage', 'backgroundImage'];
      imageFields.forEach(field => {
        if (existingForm[field] && existingForm[field].startsWith('/uploads/')) {
          const filename = existingForm[field].replace('/uploads/', '');
          const imagePath = path.join(__dirname, '..', 'uploads', filename);
          console.log('Deleting image:', imagePath);
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
            console.log('Image deleted:', filename);
          }
        }
      });

      const result = await instituteFormsCollection.deleteOne({ _id: objectId });
      
      console.log('Delete result:', result);
      
      res.json({
        success: true,
        message: 'ইনস্টিটিউট ফর্ম মুছে ফেলা হয়েছে'
      });
    } catch (error) {
      console.error('Delete institute form error:', error);
      res.status(500).json({
        success: false,
        message: 'ইনস্টিটিউট ফর্ম মুছতে সমস্যা হয়েছে',
        error: error.message
      });
    }
  });

  // GET single institute form
  router.get('/institute-forms/:id', async (req, res) => {
    try {
      const { id } = req.params;
      console.log('Getting institute form with ID:', id);
      
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'অবৈধ আইডি' });
      }

      const objectId = new ObjectId(id);
      const form = await instituteFormsCollection.findOne({ _id: objectId });
      
      if (!form) {
        return res.status(404).json({ success: false, message: 'ইনস্টিটিউট ফর্ম পাওয়া যায়নি' });
      }

      res.json({
        success: true,
        data: form
      });
    } catch (error) {
      console.error('Get institute form error:', error);
      res.status(500).json({
        success: false,
        message: 'ইনস্টিটিউট ফর্ম লোড করতে সমস্যা হয়েছে',
        error: error.message
      });
    }
  });

  return router;
};