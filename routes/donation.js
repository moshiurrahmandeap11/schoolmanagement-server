// routes/donation.js
const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const upload = require('../middleware/upload'); 

module.exports = (db) => {
  const instantDonations = db.collection('instantDonations');
  const donorCategories = db.collection('donorCategories');
  const donors = db.collection('donors');
  const donationAccounts = db.collection('donationAccounts');
  const receivedDonations = db.collection('receivedDonations');
    const donationProjects = db.collection('donationProjects'); 
  const path = require('path');
const fs = require('fs');

  // ================================
  // 1. CREATE - Instant Donation
  // POST /api/donation/instant-donations
  // ================================
  router.post('/instant-donations', async (req, res) => {
    try {
      const { donorName, address, mobile, amount, collectedBy } = req.body;

      if (!donorName || !mobile || !amount || !collectedBy) {
        return res.status(400).json({
          success: false,
          message: 'দাতার নাম, মোবাইল, পরিমাণ ও সংগ্রহকারী আবশ্যক'
        });
      }

      const donation = {
        donorName: donorName.trim(),
        address: address?.trim() || '',
        mobile: mobile.trim(),
        amount: parseFloat(amount),
        collectedBy: collectedBy.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'received'
      };

      const result = await instantDonations.insertOne(donation);

      res.status(201).json({
        success: true,
        message: 'ইনস্ট্যান্ট দান সফলভাবে গ্রহণ করা হয়েছে',
        data: { _id: result.insertedId, ...donation }
      });
    } catch (error) {
      console.error('Instant Donation Create Error:', error);
      res.status(500).json({
        success: false,
        message: 'দান গ্রহণ করতে সমস্যা হয়েছে'
      });
    }
  });

  // ================================
  // 2. READ - All Instant Donations
  // GET /api/donation/instant-donations
  // ================================
  router.get('/instant-donations', async (req, res) => {
    try {
      const donations = await instantDonations
        .find()
        .sort({ createdAt: -1 })
        .toArray();

      res.json({
        success: true,
        count: donations.length,
        data: donations
      });
    } catch (error) {
      console.error('Instant Donation List Error:', error);
      res.status(500).json({
        success: false,
        message: 'দানের তালিকা লোড করতে সমস্যা হয়েছে'
      });
    }
  });

  // ================================
  // 3. READ SINGLE - By ID
  // GET /api/donation/instant-donations/:id
  // ================================
  router.get('/instant-donations/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'অবৈধ আইডি' });
      }

      const donation = await instantDonations.findOne({ _id: new ObjectId(id) });

      if (!donation) {
        return res.status(404).json({ success: false, message: 'দান পাওয়া যায়নি' });
      }

      res.json({ success: true, data: donation });
    } catch (error) {
      res.status(500).json({ success: false, message: 'দান লোড করতে সমস্যা' });
    }
  });

  // ================================
  // 4. UPDATE - Edit Donation
  // PUT /api/donation/instant-donations/:id
  // ================================
  router.put('/instant-donations/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'অবৈধ আইডি' });
      }

      const { donorName, address, mobile, amount, collectedBy } = req.body;

      if (!donorName || !mobile || !amount || !collectedBy) {
        return res.status(400).json({
          success: false,
          message: 'সব তথ্য পূরণ করুন'
        });
      }

      const updateData = {
        donorName: donorName.trim(),
        address: address?.trim() || '',
        mobile: mobile.trim(),
        amount: parseFloat(amount),
        collectedBy: collectedBy.trim(),
        updatedAt: new Date()
      };

      const result = await instantDonations.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ success: false, message: 'দান পাওয়া যায়নি' });
      }

      res.json({
        success: true,
        message: 'দান সফলভাবে আপডেট করা হয়েছে',
        data: { _id: id, ...updateData }
      });
    } catch (error) {
      console.error('Update Error:', error);
      res.status(500).json({ success: false, message: 'আপডেট করতে সমস্যা হয়েছে' });
    }
  });

  // ================================
  // 5. DELETE - Delete Donation
  // DELETE /api/donation/instant-donations/:id
  // ================================
  router.delete('/instant-donations/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'অবৈধ আইডি' });
      }

      const result = await instantDonations.deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return res.status(404).json({ success: false, message: 'দান পাওয়া যায়নি' });
      }

      res.json({
        success: true,
        message: 'দান স্থায়ীভাবTRIBUTES মুছে ফেলা হয়েছে'
      });
    } catch (error) {
      console.error('Delete Error:', error);
      res.status(500).json({ success: false, message: 'মুছে ফেলতে সমস্যা হয়েছে' });
    }
  });


 router.post('/categories', async (req, res) => {
    try {
      const { name, description = '' } = req.body;

      // ভ্যালিডেশন
      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'ক্যাটাগরির নাম কমপক্ষে ২ অক্ষরের হতে হবে'
        });
      }

      const trimmedName = name.trim();
      const trimmedDesc = description.trim();

      // ডুপ্লিকেট চেক
      const exists = await donorCategories.findOne({ name: trimmedName });
      if (exists) {
        return res.status(409).json({
          success: false,
          message: 'এই নামে ইতিমধ্যে একটি ক্যাটাগরি আছে'
        });
      }

      const result = await donorCategories.insertOne({
        name: trimmedName,
        description: trimmedDesc,
        createdAt: new Date(),
        updatedAt: new Date(),
        totalDonors: 0,    // পরে দাতা যোগ হলে বাড়বে
        totalAmount: 0     // পরে দান যোগ হলে বাড়বে
      });

      res.status(201).json({
        success: true,
        message: 'ক্যাটাগরি সফলভাবে তৈরি হয়েছে',
        data: {
          _id: result.insertedId,
          name: trimmedName,
          description: trimmedDesc,
          totalDonors: 0,
          totalAmount: 0
        }
      });
    } catch (error) {
      console.error('Category Create Error:', error);
      res.status(500).json({
        success: false,
        message: 'সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করুন'
      });
    }
  });

  // READ ALL - সব ক্যাটাগরি
  router.get('/categories', async (req, res) => {
    try {
      const categories = await donorCategories
        .find()
        .sort({ createdAt: -1 })
        .toArray();

      res.json({
        success: true,
        count: categories.length,
        data: categories
      });
    } catch (error) {
      console.error('Category List Error:', error);
      res.status(500).json({
        success: false,
        message: 'ক্যাটাগরি লোড করতে ব্যর্থ হয়েছে'
      });
    }
  });

  // UPDATE - ক্যাটাগরি এডিট
  router.put('/categories/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'অবৈধ ক্যাটাগরি আইডি' });
      }

      const { name, description = '' } = req.body;

      if (!name || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'নাম কমপক্ষে ২ অক্ষরের হতে হবে'
        });
      }

      const trimmedName = name.trim();
      const trimmedDesc = description.trim();

      // ডুপ্লিকেট চেক (নিজেরটা ছাড়া)
      const exists = await donorCategories.findOne({
        name: trimmedName,
        _id: { $ne: new ObjectId(id) }
      });

      if (exists) {
        return res.status(409).json({
          success: false,
          message: 'এই নামে অন্য একটি ক্যাটাগরি আছে'
        });
      }

      const result = await donorCategories.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            name: trimmedName,
            description: trimmedDesc,
            updatedAt: new Date()
          }
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ success: false, message: 'ক্যাটাগরি পাওয়া যায়নি' });
      }

      res.json({
        success: true,
        message: 'ক্যাটাগরি সফলভাবে আপডেট হয়েছে',
        data: { _id: id, name: trimmedName, description: trimmedDesc }
      });
    } catch (error) {
      console.error('Category Update Error:', error);
      res.status(500).json({ success: false, message: 'আপডেট করতে সমস্যা হয়েছে' });
    }
  });

  // DELETE - ক্যাটাগরি মুছে ফেলা
  router.delete('/categories/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'অবৈধ আইডি' });
      }

      // চেক করি এই ক্যাটাগরিতে কোনো দাতা আছে কি না (পরে ব্যবহার করতে পারো)
      // const hasDonors = await db.collection('donors').countDocuments({ categoryId: id });
      // if (hasDonors > 0) {
      //   return res.status(403).json({ success: false, message: 'এই ক্যাটাগরিতে দাতা আছে, মুছা যাবে না' });
      // }

      const result = await donorCategories.deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return res.status(404).json({ success: false, message: 'ক্যাটাগরি পাওয়া যায়নি' });
      }

      res.json({
        success: true,
        message: 'ক্যাটাগরি স্থায়ীভাবে মুছে ফেলা হয়েছে'
      });
    } catch (error) {
      console.error('Category Delete Error:', error);
      res.status(500).json({ success: false, message: 'মুছে ফেলতে সমস্যা হয়েছে' });
    }
  });



  // CREATE - New Donor
router.post('/donors', async (req, res) => {
  try {
    const {
      categoryId,
      donorName,
      mobile,
      address = '',
      regularAmount = 0,
      donationType = 'monthly', // monthly, yearly, one-time
      donationPeriod = 'monthly',
      note = ''
    } = req.body;

    if (!categoryId || !donorName || !mobile) {
      return res.status(400).json({
        success: false,
        message: 'ক্যাটাগরি, দাতার নাম ও মোবাইল আবশ্যক'
      });
    }

    // চেক করি ক্যাটাগরি আছে কিনা
    const categoryExists = await donorCategories.findOne({ _id: new ObjectId(categoryId) });
    if (!categoryExists) {
      return res.status(400).json({ success: false, message: 'ক্যাটাগরি পাওয়া যায়নি' });
    }

    const donor = {
      categoryId: new ObjectId(categoryId),
      categoryName: categoryExists.name,
      donorName: donorName.trim(),
      mobile: mobile.trim(),
      address: address.trim(),
      regularAmount: parseFloat(regularAmount) || 0,
      donationType,
      donationPeriod,
      note: note.trim(),
      totalDonated: 0,
      lastDonationDate: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await donors.insertOne(donor);

    // ক্যাটাগরির totalDonors বাড়াও
    await donorCategories.updateOne(
      { _id: new ObjectId(categoryId) },
      { $inc: { totalDonors: 1 } }
    );

    res.status(201).json({
      success: true,
      message: 'দাতা সফলভাবে যোগ হয়েছে',
      data: { _id: result.insertedId, ...donor }
    });
  } catch (error) {
    console.error('Donor Create Error:', error);
    res.status(500).json({ success: false, message: 'দাতা যোগ করতে সমস্যা' });
  }
});

// READ ALL Donors + Search + Filter
router.get('/donors', async (req, res) => {
  try {
    const { search = '', category = '', page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      query.$or = [
        { donorName: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) {
      query.categoryId = new ObjectId(category);
    }

    const total = await donors.countDocuments(query);
    const donorList = await donors
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    res.json({
      success: true,
      count: donorList.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: donorList
    });
  } catch (error) {
    console.error('Donor List Error:', error);
    res.status(500).json({ success: false, message: 'দাতার তালনিকা লোড করতে সমস্যা' });
  }
});

// UPDATE Donor
router.put('/donors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'অবৈধ আইডি' });

    const {
      categoryId,
      donorName,
      mobile,
      address,
      regularAmount,
      donationType,
      donationPeriod,
      note
    } = req.body;

    if (!donorName || !mobile || !categoryId) {
      return res.status(400).json({ success: false, message: 'নাম, মোবাইল, ক্যাটাগরি আবশ্যক' });
    }

    const category = await donorCategories.findOne({ _id: new ObjectId(categoryId) });
    if (!category) return res.status(400).json({ success: false, message: 'ক্যাটাগরি পাওয়া যায়নি' });

    const updateData = {
      categoryId: new ObjectId(categoryId),
      categoryName: category.name,
      donorName: donorName.trim(),
      mobile: mobile.trim(),
      address: address?.trim() || '',
      regularAmount: parseFloat(regularAmount) || 0,
      donationType: donationType || 'monthly',
      donationPeriod: donationPeriod || 'monthly',
      note: note?.trim() || '',
      updatedAt: new Date()
    };

    const result = await donors.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'দাতা পাওয়া যায়নি' });
    }

    res.json({
      success: true,
      message: 'দাতা আপডেট হয়েছে',
      data: { _id: id, ...updateData }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'আপডেট সমস্যা' });
  }
});

// DELETE Donor
router.delete('/donors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'অবৈধ আইডি' });

    const donor = await donors.findOne({ _id: new ObjectId(id) });
    if (!donor) return res.status(404).json({ success: false, message: 'দাতা পাওয়া যায়নি' });

    await donors.deleteOne({ _id: new ObjectId(id) });

    // ক্যাটাগরির totalDonors কমাও
    await donorCategories.updateOne(
      { _id: donor.categoryId },
      { $inc: { totalDonors: -1 } }
    );

    res.json({ success: true, message: 'দাতা মুছে ফেলা হয়েছে' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'মুছে ফেলতে সমস্যা' });
  }
});



// CREATE - New Account
router.post('/donor-account', async (req, res) => {
  try {
    const {
      bankName = '',
      bankBranch = '',
      bankAccountNumber = '',
      bkashNumber = '',
      nagadNumber = '',
      rocketNumber = '',
      contactNumber = ''
    } = req.body;

    if (!bankAccountNumber && !bkashNumber && !nagadNumber && !rocketNumber) {
      return res.status(400).json({
        success: false,
        message: 'কমপক্ষে একটি একাউন্ট নম্বর দিতে হবে'
      });
    }

    const account = {
      bankName: bankName.trim(),
      bankBranch: bankBranch.trim(),
      bankAccountNumber: bankAccountNumber.trim(),
      bkashNumber: bkashNumber.trim(),
      nagadNumber: nagadNumber.trim(),
      rocketNumber: rocketNumber.trim(),
      contactNumber: contactNumber.trim(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await donationAccounts.insertOne(account);

    res.status(201).json({
      success: true,
      message: 'একাউন্ট সফলভাবে যোগ হয়েছে',
      data: { _id: result.insertedId, ...account }
    });
  } catch (error) {
    console.error('Account Create Error:', error);
    res.status(500).json({ success: false, message: 'একাউন্ট যোগ করতে সমস্যা' });
  }
});

// READ ALL
router.get('/donor-account', async (req, res) => {
  try {
    const accounts = await donationAccounts
      .find()
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      count: accounts.length,
      data: accounts
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'লোড করতে সমস্যা' });
  }
});

// UPDATE
router.put('/donor-account/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'অবৈধ আইডি' });

    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };

    const result = await donationAccounts.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'একাউন্ট পাওয়া যায়নি' });
    }

    res.json({
      success: true,
      message: 'একাউন্ট আপডেট হয়েছে',
      data: { _id: id, ...updateData }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'আপডেট সমস্যা' });
  }
});

// DELETE
router.delete('/donor-account/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'অবৈধ আইডি' });

    const result = await donationAccounts.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'একাউন্ট পাওয়া যায়নি' });
    }

    res.json({ success: true, message: 'একাউন্ট মুছে ফেলা হয়েছে' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'মুছে ফেলতে সমস্যা' });
  }
});



/// CREATE - New Received Donation (কিছুই required না!)
router.post('/received-donations', async (req, res) => {
  try {
    const {
      projectId,
      donorId,
      donorName = '',
      donorMobile = '',
      accountId,
      accountNumber = '',
      accountType = 'bkash', // ডিফল্ট
      amount = 0,
      collectedBy = 'অজ্ঞাত',
      note = ''
    } = req.body;

    // শুধু amount আর collectedBy ছাড়া বাকি সব অপশনাল
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'দানের পরিমাণ আবশ্যক এবং ১ টাকার বেশি হতে হবে'
      });
    }

    if (!collectedBy.trim()) {
      return res.status(400).json({
        success: false,
        message: 'সংগ্রহকারীর নাম দিতে হবে'
      });
    }

    const donationData = {
      amount: parseFloat(amount),
      collectedBy: collectedBy.trim(),
      accountType,
      note: note || '',
      receivedAt: new Date(),
      createdAt: new Date()
    };

    // প্রজেক্ট থাকলে যোগ করো
    if (projectId && ObjectId.isValid(projectId)) {
      const project = await db.collection('donationProjects').findOne({ _id: new ObjectId(projectId) });
      if (project) {
        donationData.projectId = new ObjectId(projectId);
        donationData.projectName = project.name;
      }
    }

    // দাতা থাকলে যোগ করো
    if (donorId && ObjectId.isValid(donorId)) {
      const donor = await donors.findOne({ _id: new ObjectId(donorId) });
      if (donor) {
        donationData.donorId = new ObjectId(donorId);
        donationData.donorName = donor.donorName;
        donationData.donorMobile = donor.mobile;
      }
    } else if (donorName || donorMobile) {
      // দাতা আইডি না থাকলেও নাম/মোবাইল দিয়ে রাখো
      donationData.donorName = donorName.trim();
      donationData.donorMobile = donorMobile.trim();
    }

    // একাউন্ট থাকলে যোগ করো
    if (accountId && ObjectId.isValid(accountId)) {
      const account = await donationAccounts.findOne({ _id: new ObjectId(accountId) });
      if (account) {
        donationData.accountId = new ObjectId(accountId);
        donationData.accountNumber = accountNumber || 
          account.bankAccountNumber || 
          account.bkashNumber || 
          account.nagadNumber || 
          account.rocketNumber || '';
      }
    } else if (accountNumber) {
      donationData.accountNumber = accountNumber.trim();
    }

    const result = await receivedDonations.insertOne(donationData);

    // দাতা থাকলে totalDonated আপডেট
    if (donationData.donorId) {
      await donors.updateOne(
        { _id: donationData.donorId },
        {
          $inc: { totalDonated: parseFloat(amount) },
          $set: { lastDonationDate: new Date() }
        }
      );
    }

    // প্রজেক্ট থাকলে totalCollected আপডেট
    if (donationData.projectId) {
      await db.collection('donationProjects').updateOne(
        { _id: donationData.projectId },
        { $inc: { totalCollected: parseFloat(amount) } }
      );
    }

    res.status(201).json({
      success: true,
      message: 'দান সফলভাবে গ্রহণ করা হয়েছে',
      data: { _id: result.insertedId, ...donationData }
    });

  } catch (error) {
    console.error('Receive Donation Error:', error);
    res.status(500).json({
      success: false,
      message: 'দান গ্রহণ করতে সমস্যা হয়েছে'
    });
  }
});

// READ ALL - সব দান
router.get('/received-donations', async (req, res) => {
  try {
    const donations = await receivedDonations
      .find()
      .sort({ receivedAt: -1 })
      .toArray();

    res.json({
      success: true,
      count: donations.length,
      data: donations
    });
  } catch (error) {
    console.error('Load Error:', error);
    res.status(500).json({ success: false, message: 'লোড করতে সমস্যা' });
  }
});

// DELETE - দান মুছে ফেলা
router.delete('/received-donations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'অবৈধ আইডি' });
    }

    const donation = await receivedDonations.findOne({ _id: new ObjectId(id) });
    if (!donation) {
      return res.status(404).json({ success: false, message: 'দান পাওয়া যায়নি' });
    }

    await receivedDonations.deleteOne({ _id: new ObjectId(id) });

    // দাতা থাকলে totalDonated কমাও
    if (donation.donorId) {
      await donors.updateOne(
        { _id: donation.donorId },
        { $inc: { totalDonated: -donation.amount } }
      );
    }

    // প্রজেক্ট থাকলে totalCollected কমাও
    if (donation.projectId) {
      await db.collection('donationProjects').updateOne(
        { _id: donation.projectId },
        { $inc: { totalCollected: -donation.amount } }
      );
    }

    res.json({ success: true, message: 'দান মুছে ফেলা হয়েছে' });
  } catch (error) {
    console.error('Delete Error:', error);
    res.status(500).json({ success: false, message: 'মুছে ফেলতে সমস্যা' });
  }
});

// GET ALL PROJECTS
router.get('/projects', async (req, res) => {
  try {
    const projects = await donationProjects
      .find({ status: { $ne: 'deleted' } })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      count: projects.length,
      data: projects
    });
  } catch (error) {
    console.error('Projects Load Error:', error);
    res.json({ success: true, count: 0, data: [] });
  }
});

router.post('/projects', upload.single('image'), async (req, res) => {
    try {
      const { name = '', description = '', videoLink = '', status = 'draft' } = req.body;

      let imagePath = '';
      if (req.file) {
        imagePath = `/api/uploads/${req.file.filename}`;
      }

      const project = {
        name: name.trim() || 'নামহীন প্রজেক্ট',
        description: description || '',
        image: imagePath,
        imageOriginalName: req.file?.originalname || '',
        videoLink: videoLink.trim(),
        status,
        totalCollected: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await donationProjects.insertOne(project);

      res.status(201).json({
        success: true,
        message: 'প্রজেক্ট সফলভাবে তৈরি হয়েছে',
        data: { _id: result.insertedId, ...project }
      });
    } catch (error) {
      console.error('Create Project Error:', error);
      res.status(500).json({ success: false, message: 'প্রজেক্ট তৈরি করতে সমস্যা' });
    }
  });

// UPDATE - প্রজেক্ট এডিট + ছবি রিপ্লেস
router.put('/projects/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'অবৈধ আইডি' });
    }

    const existingProject = await donationProjects.findOne({ _id: new ObjectId(id) });
    if (!existingProject) {
      return res.status(404).json({ success: false, message: 'প্রজেক্ট পাওয়া যায়নি' });
    }

    const { name = '', description = '', videoLink = '', status = 'draft' } = req.body;

    let imagePath = existingProject.image;
    let imageOriginalName = existingProject.imageOriginalName;

    // নতুন ছবি থাকলে পুরানোটা মুছে ফেলো
    if (req.file) {
      if (existingProject.image && existingProject.image.startsWith('/api/uploads/')) {
        const oldFileName = existingProject.image.replace('/api/uploads/', '');
        const oldPath = path.join(__dirname, '..', 'uploads', oldFileName);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      imagePath = `/api/uploads/${req.file.filename}`;
      imageOriginalName = req.file.originalname;
    }

    const updateData = {
      name: name.trim() || 'নামহীন প্রজেক্ট',
      description: description || '',
      image: imagePath,
      imageOriginalName,
      videoLink: videoLink.trim(),
      status,
      updatedAt: new Date()
    };

    const result = await donationProjects.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'প্রজেক্ট পাওয়া যায়নি' });
    }

    res.json({
      success: true,
      message: 'প্রজেক্ট সফলভাবে আপডেট হয়েছে',
      data: { _id: id, ...updateData }
    });
  } catch (error) {
    console.error('Update Project Error:', error);
    res.status(500).json({ success: false, message: 'আপডেট করতে সমস্যা' });
  }
});

// DELETE - প্রজেক্ট + ছবি মুছে ফেলা
router.delete('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'অবৈধ আইডি' });
    }

    const project = await donationProjects.findOne({ _id: new ObjectId(id) });
    if (!project) {
      return res.status(404).json({ success: false, message: 'প্রজেক্ট পাওয়া যায়নি' });
    }

    // ছবি মুছে ফেলো
    if (project.image && project.image.startsWith('/api/uploads/')) {
      const filename = project.image.replace('/api/uploads/', '');
      const imagePath = path.join(__dirname, '..', 'uploads', filename);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await donationProjects.deleteOne({ _id: new ObjectId(id) });

    res.json({
      success: true,
      message: 'প্রজেক্ট ও ছবি স্থায়ীভাবে মুছে ফেলা হয়েছে'
    });
  } catch (error) {
    console.error('Delete Project Error:', error);
    res.status(500).json({ success: false, message: 'মুছে ফেলতে সমস্যা' });
  }
});

  return router;
};