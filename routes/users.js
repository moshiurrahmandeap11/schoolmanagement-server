const express = require("express");
const { ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const verifyToken = require("../middleware/authMiddleware");
const admin = require("firebase-admin");

const router = express.Router();

module.exports = (usersCollection) => {
  // Initialize Firebase Admin SDK
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  }

  // ✅ Signup route
router.post("/signup", async (req, res) => {
  try {
    const { fullName, email, password, idToken } = req.body;

    // 🔹 Optional: Firebase token verify
    let firebaseUid = null;
    if (idToken) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        firebaseUid = decodedToken.uid;
      } catch (err) {
        console.error("Firebase token invalid:", err);
        return res.status(401).json({ success: false, message: "Invalid Firebase token" });
      }
    }

    // 🔹 Check if user exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "User already exists" });
    }

    // 🔹 Hash password
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const newUser = {
      fullName,
      email,
      password: hashedPassword,
      firebaseUid,
      role: "user",
      createdAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);

    const user = { ...newUser, _id: result.insertedId };

    // 🔹 Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "7d" }
    );

    // 🔹 Set HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({ success: true, user });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ success: false, message: `Server Error: ${error.message}` });
  }
});


router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await usersCollection.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Only verify if password exists
    if (user.password) {
      if (!bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ success: false, message: "Invalid password" });
      }
    } 
    // else skip, Firebase user can login normally

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role || "user" },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: `Server Error: ${error.message}` });
  }
});



  // 🔑 Google login + set JWT cookie
  router.post("/google-login", async (req, res) => {
    const { idToken } = req.body;
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const { email, uid, name } = decodedToken;

      let user = await usersCollection.findOne({ email });
      if (!user) {
        const newUser = {
          email,
          firebaseUid: uid,
          displayName: name,
          role: "user",
          createdAt: new Date(),
        };
        const result = await usersCollection.insertOne(newUser);
        user = { ...newUser, _id: result.insertedId };
      }

      const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role || "user" },
        process.env.JWT_SECRET || "default_secret",
        { expiresIn: "7d" }
      );

      res.cookie("token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({ success: true, user });
    } catch (error) {
      console.error("Google login error:", error);
      res.status(500).json({ success: false, message: `Google login failed: ${error.message}` });
    }
  });

  // 🔑 Facebook login + set JWT cookie
  router.post("/facebook-login", async (req, res) => {
    const { idToken } = req.body;
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const { email, uid, name } = decodedToken;

      let user = await usersCollection.findOne({ email });
      if (!user) {
        const newUser = {
          email,
          firebaseUid: uid,
          displayName: name,
          role: "user",
          createdAt: new Date(),
        };
        const result = await usersCollection.insertOne(newUser);
        user = { ...newUser, _id: result.insertedId };
      }

      const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role || "user" },
        process.env.JWT_SECRET || "default_secret",
        { expiresIn: "7d" }
      );

      res.cookie("token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({ success: true, user });
    } catch (error) {
      console.error("Facebook login error:", error);
      res.status(500).json({ success: false, message: `Facebook login failed: ${error.message}` });
    }
  });

  // 🔓 Logout - clear cookie
  router.post("/logout", (req, res) => {
    res.clearCookie("token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });
    res.json({ success: true, message: "Logged out" });
  });

  // ✅ GET all users (Protected)
  router.get("/",  async (req, res) => {
    try {
      const users = await usersCollection.find().toArray();
      res.status(200).json({ success: true, count: users.length, data: users });
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ success: false, message: `Server Error: ${error.message}` });
    }
  });

  // ✅ GET single user by MongoDB _id
  router.get("/:id",  async (req, res) => {
    try {
      const { id } = req.params;

      // Validate ObjectId
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid user ID format" });
      }

      const user = await usersCollection.findOne({ _id: new ObjectId(id) });
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      res.status(200).json({ success: true, data: user });
    } catch (error) {
      console.error("Error fetching user by ID:", error);
      res.status(500).json({ success: false, message: `Server Error: ${error.message}` });
    }
  });

  // ✅ GET single user by Firebase UID
  router.get("/uid/:uid",  async (req, res) => {
    try {
      const { uid } = req.params;

      // Validate UID (basic check for non-empty string)
      if (!uid || typeof uid !== "string") {
        return res.status(400).json({ success: false, message: "Invalid Firebase UID" });
      }

      const user = await usersCollection.findOne({ firebaseUid: uid });
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      res.status(200).json({ success: true, data: user });
    } catch (error) {
      console.error("Error fetching user by Firebase UID:", error);
      res.status(500).json({ success: false, message: `Server Error: ${error.message}` });
    }
  });

  // ✅ Register new user
  router.post("/", async (req, res) => {
    try {
      const { password, ...rest } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = { ...rest, password: hashedPassword, role: "user", createdAt: new Date() };
      const result = await usersCollection.insertOne(newUser);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ success: false, message: `Server Error: ${error.message}` });
    }
  });

  // ✅ Update user
  router.put("/:id", verifyToken, async (req, res) => {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid user ID format" });
      }

      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: req.body }
      );
      if (result.modifiedCount === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ success: false, message: `Server Error: ${error.message}` });
    }
  });

  // ✅ Delete user (admin only)
  router.delete("/:id", verifyToken, async (req, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid user ID format" });
      }

      const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ success: false, message: `Server Error: ${error.message}` });
    }
  });

  return router;
};