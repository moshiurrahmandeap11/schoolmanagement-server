const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const upload = require("../middleware/upload");
const path = require("path");
const fs = require("fs");

module.exports = (slidersCollection) => {
  // GET all sliders
  router.get("/", async (req, res) => {
    try {
      const sliders = await slidersCollection.find().toArray();
      res.json({
        success: true,
        data: sliders,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "স্লাইডার লোড করতে সমস্যা হয়েছে",
        error: error.message,
      });
    }
  });

  // CREATE new slider with multiple file upload
  router.post("/", upload.array("images", 10), async (req, res) => {
    try {
      const { title, autoPlay, speed } = req.body;

      // Validation
      if (!title) {
        return res.status(400).json({
          success: false,
          message: "টাইটেল আবশ্যক",
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "অন্তত একটি ইমেজ ফাইল আবশ্যক",
        });
      }

      // routes/sliders.js-এও image path ঠিক করুন
      const imagePaths = req.files.map((file) => ({
        path: `/api/uploads/${file.filename}`, // EI LINE THIK KORTE HOBE
        originalName: file.originalname,
      }));

      const newSlider = {
        title,
        images: imagePaths,
        autoPlay: autoPlay !== undefined ? JSON.parse(autoPlay) : true,
        speed: speed ? parseInt(speed) : 3000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await slidersCollection.insertOne(newSlider);

      res.status(201).json({
        success: true,
        message: "স্লাইডার সফলভাবে তৈরি হয়েছে",
        data: {
          _id: result.insertedId,
          ...newSlider,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "স্লাইডার তৈরি করতে সমস্যা হয়েছে",
        error: error.message,
      });
    }
  });

  // DELETE slider
  router.delete("/:id", async (req, res) => {
    try {
      const slider = await slidersCollection.findOne({
        _id: new ObjectId(req.params.id),
      });

      if (!slider) {
        return res.status(404).json({
          success: false,
          message: "স্লাইডার পাওয়া যায়নি",
        });
      }

      // Delete all image files
      if (slider.images && Array.isArray(slider.images)) {
        slider.images.forEach((image) => {
          if (image.path && image.path.startsWith("/uploads/")) {
            const imagePath = path.join(__dirname, "..", image.path);
            if (fs.existsSync(imagePath)) {
              fs.unlinkSync(imagePath);
            }
          }
        });
      }

      const result = await slidersCollection.deleteOne({
        _id: new ObjectId(req.params.id),
      });

      res.json({
        success: true,
        message: "স্লাইডার সফলভাবে ডিলিট হয়েছে",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "স্লাইডার ডিলিট করতে সমস্যা হয়েছে",
        error: error.message,
      });
    }
  });

  // TOGGLE slider autoPlay
  router.patch("/:id/toggle-autoplay", async (req, res) => {
    try {
      const slider = await slidersCollection.findOne({
        _id: new ObjectId(req.params.id),
      });

      if (!slider) {
        return res.status(404).json({
          success: false,
          message: "স্লাইডার পাওয়া যায়নি",
        });
      }

      const result = await slidersCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        {
          $set: {
            autoPlay: !slider.autoPlay,
            updatedAt: new Date(),
          },
        }
      );

      res.json({
        success: true,
        message: `অটো প্লে ${!slider.autoPlay ? "চালু" : "বন্ধ"} করা হয়েছে`,
        data: {
          autoPlay: !slider.autoPlay,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "অটো প্লে স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে",
        error: error.message,
      });
    }
  });

  return router;
};
