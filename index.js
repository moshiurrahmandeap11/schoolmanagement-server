const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Configure CORS to allow requests from the frontend origin
app.use(
  cors({
    origin: true, // Sob origin ke allow kore
    credentials: true, // Cookies allow kora
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(cookieParser());

// Create uploads directory if not exists - EI LINE AGE KORTE HOBE
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Uploads directory created');
}

// Serve uploaded files statically - EI LINE THIK KORTE HOBE
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

const user = process.env.USER_DB;
const pass = process.env.USER_PASS;

console.log(user, pass);

const uri = `mongodb+srv://${user}:${pass}@cluster0.temrfiu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Root route - must be before async run()
app.get("/", (req, res) => {
  res.json({ 
    message: "School Management API is running",
    version: "1.0.0",
    endpoints: {
      users: "/api/users",
      banners: "/api/banners", 
      sliders: "/api/sliders",
      recently: "/api/recently",
      schoolhistory: "api/school-history",
      speech: "api/speech",
      students: "api/students",
      classes: "api/classes",
      totalSeats: "api/total-seats",
      classRooms: "api/classrooms",
      admissionInfo: "api/admission-info",
      admissionForm: "api/admission-form",
      teachersList: "api/teachers-list",
      workersList: "api/workers-list",
      headmasterList: "api/headmasters-list",
      holidays: "api/holiday",
      circular: "api/circular",
      gallary: "api/gallery",
      blogs: "api/blogs",
      managing: "api/managing-committee",
      areaHistory: "api/area-history",
      contactInfo: "api/contact-info",
      notices: "api/notice",
      routine: "api/routine",
      health: "/health",
      testDb: "/api/test-db",
      uploads: "/api/uploads"
    }
  });
});

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("MongoDB connected successfully");

    const db = client.db("schoolManagement");
    const usersCollection = db.collection("users");
    const bannersCollection = db.collection("banners");
    const slidersCollection = db.collection("sliders");
    const recentlyCollection = db.collection("recently");
    const schoolHistoryCollection = db.collection("school-History");
    const speechCollection = db.collection("speech");
    const studentsCollection = db.collection("students");
    const classesCollection = db.collection("classes");
    const totalSeatCollection = db.collection("total-seat");
    const classRoomsCollection = db.collection("class-rooms");
    const admissionInfoCollection = db.collection("admission-info");
    const admissionFormCollection = db.collection("admission-form");
    const teachersListCollection = db.collection("teacher-list");
    const workersListCollection = db.collection("workers-list");
    const headmastersCollection = db.collection("headmasters-list");
    const holidayCollection = db.collection("holiday");
    const circularCollection = db.collection("circular");
    const galleryCollection = db.collection("gallary");
    const blogsCollection = db.collection("blogs");
    const managingCollection = db.collection("managing");
    const areaHistoryCollection = db.collection("area-history");
    const contactInfoCollection = db.collection("contact-info");
    const noticeCollection = db.collection("notice");
    const routineCollection = db.collection("routine");

    // Mount routes with collections - Fixed way
    const usersRouter = require("./routes/users")(usersCollection);
    const bannersRouter = require("./routes/banners")(bannersCollection);
    const slidersRouter = require("./routes/sliders")(slidersCollection);
    const recentlyRouter = require("./routes/recently") (recentlyCollection);
    const schoolHistoryRouter = require("./routes/school-history") (schoolHistoryCollection)
    const speechRouter = require("./routes/speech") (speechCollection);
    const studentsRouter = require("./routes/students")(studentsCollection);
    const classesRouter = require("./routes/classes")(classesCollection);
    const totalSeatRouter = require("./routes/total-seats")(totalSeatCollection);
    const classRoomsRouter = require("./routes/classrooms")(classRoomsCollection);
    const admissionInfoRouter = require("./routes/admission-info") (admissionInfoCollection);
    const admissionFormRouter = require("./routes/admission-form") (admissionFormCollection);
    const teachersListRouter = require("./routes/teachers-list") (teachersListCollection);
    const workersListRouter = require("./routes/workers-list") (workersListCollection);
    const headmasterListRouter = require("./routes/headmaster-list") (headmastersCollection);
    const holidayRouter = require("./routes/holiday") (holidayCollection);
    const circularRouter = require("./routes/circular") (circularCollection);
    const gallaryRouter = require("./routes/gallary") (galleryCollection);
    const blogsRouter = require("./routes/blogs") (blogsCollection);
    const managingRouter = require("./routes/managing") (managingCollection);
    const areaHistoryRouter = require("./routes/area-history") (areaHistoryCollection);
    const contactInfoRouter = require("./routes/contactinfo") (contactInfoCollection);
    const noticeRouter = require("./routes/notices") (noticeCollection);
    const routineRouter = require("./routes/routine") (routineCollection);

    app.use("/api/users", usersRouter);
    app.use("/api/banners", bannersRouter);
    app.use("/api/sliders", slidersRouter);
    app.use("/api/recently", recentlyRouter);
    app.use("/api/school-history", schoolHistoryRouter);
    app.use("/api/speeches", speechRouter);
    app.use("/api/students", studentsRouter);
    app.use("/api/classes", classesRouter);
    app.use("/api/total-seats", totalSeatRouter);
    app.use("/api/classrooms", classRoomsRouter);
    app.use("/api/admission-info", admissionInfoRouter);
    app.use("/api/admission-form", admissionFormRouter);
    app.use("/api/teacher-list", teachersListRouter);
    app.use("/api/workers-list", workersListRouter);
    app.use("/api/headmasters-list", headmasterListRouter);
    app.use("/api/holiday", holidayRouter);
    app.use("/api/circulars", circularRouter);
    app.use("/api/gallery", gallaryRouter);
    app.use("/api/blogs", blogsRouter);
    app.use("/api/managing-committee", managingRouter);
    app.use("/api/area-history", areaHistoryRouter);
    app.use("/api/contact-info", contactInfoRouter);
    app.use("/api/notices", noticeRouter);
    app.use("/api/routines", routineRouter);

    // Health check route
    app.get("/health", (req, res) => {
      res.status(200).json({ 
        status: "OK", 
        message: "Server is running smoothly",
        timestamp: new Date().toISOString()
      });
    });

    // Test database connection route
    app.get("/api/test-db", async (req, res) => {
      try {
        // Test all collections
        const usersCount = await usersCollection.countDocuments();
        const bannersCount = await bannersCollection.countDocuments();
        const slidersCount = await slidersCollection.countDocuments();

        res.json({
          success: true,
          message: "Database connection successful",
          data: {
            users: usersCount,
            banners: bannersCount,
            sliders: slidersCount
          }
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Database connection failed",
          error: error.message
        });
      }
    });

    // Handle undefined routes
    app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: "Route not found",
        path: req.originalUrl
      });
    });

    // Error handling middleware
    app.use((error, req, res, next) => {
      console.error("Error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    });

    // Start server after MongoDB connection
    app.listen(port, () => {
      console.log(`School management API is running on port ${port}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

// Run the async function
run().catch(console.dir);