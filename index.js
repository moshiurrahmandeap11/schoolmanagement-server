const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const fs = require("fs");

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
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("Uploads directory created");
}

// Serve uploaded files statically - EI LINE THIK KORTE HOBE
app.use("/api/uploads", express.static(path.join(__dirname, "uploads")));

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
      uploads: "/api/uploads",
    },
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
    const batchesCollection = db.collection("batches");
    const sectionsCollection = db.collection("sections");
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
    const branchesCollection = db.collection("branches");
    const donationCollection = db.collection("donation");
    const certificateCollection = db.collection("certificates");
    const salaryTypesCollection = db.collection("salaryTypes");
    const instituteInfoCollection = db.collection("InstituteInfo");
    const adminContactCollection = db.collection("AdminContact");
    const eventsCollection = db.collection("Events");
    const facilitiesCollection = db.collection("Facilities");
    const socialLinksCollection = db.collection("Social-Links");
    const privacyPolicyCollection = db.collection("Privacy-Policy");
    const authorsCollection = db.collection("Authors");
    const menuCollection = db.collection("menu");
    const pagesCollection = db.collection("pages");
    const playlistCollection = db.collection("playlist");
    const videosCollection = db.collection("videos");
    const documentCategoryCollection = db.collection("document-category");
    const documentCollection = db.collection("documents");
    const teacherLessonsCollection = db.collection("teacher-lesson");
    const assignmentsCollection = db.collection("assignments");
    const sectionCollection = db.collection("sections");
    const subjectsCollection = db.collection("subjects");
    const sessionCOllection = db.collection("sessions");
    const batchCollection = db.collection("batch");
    const classReportCollection = db.collection("classreports");
    const gradingCollection = db.collection("grading");
    const examRoutineCollection = db.collection("exam-routine");
    const examCollection = db.collection("exam");
    const examCategoryCollecton = db.collection("exam-category");
    const resultsCollection = db.collection("result");
    const subjectWiseCollection = db.collection("subject-wise");
    const excelMarksCollection = db.collection("excelMarks");
    const bankAccountCollection = db.collection("bankAccounts");
    const incomeSourceCollection = db.collection("income-source");
    const expenseHeadCollection = db.collection("expenseHead");
    const expenseCategoryCollection = db.collection("expense-category");
    const paymentTypeCollection = db.collection("payment-type");
    const incomeCollection = db.collection("income");
    const expensesCollection = db.collection("expenses");
    const annualReportsCollection = db.collection("annual-reports");
    const contactCollection = db.collection("contact");
    const classCollection = db.collection("class");
    const classTeacherCollection = db.collection("class-teacher");
    const dividePathokromCollectin = db.collection("divide-pathokrom");
    const migrateStatusCollection = db.collection("migrate-status");
    const migrateBranchesCollection = db.collection("migrate-branches");
    const studentLeaveCollection = db.collection("student-leave");
    const fineTypeCollection = db.collection("fine-type");
    const feeTypeCollection = db.collection("fee-type");
    const discountCollection = db.collection("discount");
    const feeCollection = db.collection("fee");
    const addDiscountCollection = db.collection("add-discount");
    const assignFinesCollection = db.collection("assign-fines");
    const feeSettingsCollection = db.collection("fee-settings");
    const expenseItemCollection = db.collection("expense-items");
    const smartAttendanceCollection = db.collection("smart-attendance");
    const smartAttendanceShiftCollection = db.collection(
      "smart-attendance-shift"
    );
    const holidaysCollection = db.collection("holidays");
    const holidayTypeCollection = db.collection("holiday-type");
    const teacherLeaveCollection = db.collection("teacher-leave");
    const employeeLeaveCollection = db.collection("employee-leave");
    const examGroupCollection = db.collection("exam-gruop");
    const examHallCollection = db.collection("exam-hall");
    const examTimeTableCollection = db.collection("exam-timetable");
    const examArrangementCollection = db.collection("exam-arrangement");
    const combinedResultCollection = db.collection("combined-result");
    const resultSheetCollection = db.collection("result-sheet");
    const sendsmsCollection = db.collection("sms");
    const smsBalanceCollection = db.collection("smsbalance");
    const smsPurchaseCollection = db.collection("smspurchases");
    const instituteMessageCollection = db.collection("institute-messages");
    const contactMainCollection = db.collection("contact-main");
    const instituteServicesCollection = db.collection("institute-services");
    const instituteJobsCollection = db.collection("institute-jobs");
    const blogCategoryCollection = db.collection("blog-category");
    const mainAdmissionInfoCollection = db.collection("main-admission-info");
    const onlineApplicationsCollection = db.collection("online-applications");
    const facultyCollection = db.collection("faculty");
    const depertmentCollection = db.collection("depertment");
    const instituteMediaCollection = db.collection("institute-media");
    const instituteVideoCollection = db.collection("institute-video");
    const basicSettingsCollection = db.collection("basic-settings");



    // Mount routes with collections - Fixed way
    const usersRouter = require("./routes/users")(usersCollection);
    const bannersRouter = require("./routes/banners")(bannersCollection);
    const slidersRouter = require("./routes/sliders")(slidersCollection);
    const recentlyRouter = require("./routes/recently")(recentlyCollection);
    const schoolHistoryRouter = require("./routes/school-history")(
      schoolHistoryCollection
    );
    const speechRouter = require("./routes/speech")(speechCollection);
    const studentsRouter = require("./routes/students")(studentsCollection);
    const classesRouter = require("./routes/classes")(
      classesCollection,
      batchesCollection,
      sectionsCollection
    );
    const totalSeatRouter = require("./routes/total-seats")(
      totalSeatCollection
    );
    const classRoomsRouter = require("./routes/classrooms")(
      classRoomsCollection
    );
    const admissionInfoRouter = require("./routes/admission-info")(
      admissionInfoCollection
    );
    const admissionFormRouter = require("./routes/admission-form")(
      admissionFormCollection
    );
    const teachersListRouter = require("./routes/teachers-list")(
      teachersListCollection
    );
    const workersListRouter = require("./routes/workers-list")(
      workersListCollection
    );
    const headmasterListRouter = require("./routes/headmaster-list")(
      headmastersCollection
    );
    const holidayRouter = require("./routes/holiday")(holidayCollection);
    const circularRouter = require("./routes/circular")(circularCollection);
    const gallaryRouter = require("./routes/gallary")(galleryCollection);
    const blogsRouter = require("./routes/blogs")(blogsCollection);
    const managingRouter = require("./routes/managing")(managingCollection);
    const areaHistoryRouter = require("./routes/area-history")(
      areaHistoryCollection
    );
    const contactInfoRouter = require("./routes/contactinfo")(
      contactInfoCollection
    );
    const noticeRouter = require("./routes/notices")(noticeCollection);
    const routineRouter = require("./routes/routine")(routineCollection);
    const branchesRouter = require("./routes/branches")(branchesCollection);
    const donationRouter = require("./routes/donation")(db);
    const certificateRouter = require("./routes/certificate")(db);
    const salaryTypeRouter = require("./routes/salaryTypes")(
      salaryTypesCollection
    );
    const instituteInfoRouter = require("./routes/institute-info")(
      instituteInfoCollection
    );
    const adminContactRouter = require("./routes/admin-contact")(
      adminContactCollection
    );
    const eventRouter = require("./routes/events")(eventsCollection);
    const facilitiesRouter = require("./routes/facilities")(
      facilitiesCollection
    );
    const socialLinksRouter = require("./routes/sociallinks")(
      socialLinksCollection
    );
    const privacyPolicyRouter = require("./routes/privacy-policy")(
      privacyPolicyCollection
    );
    const authorsRouter = require("./routes/authors")(authorsCollection);
    const menuRouter = require("./routes/menu")(menuCollection);
    const pagesRouter = require("./routes/pages")(pagesCollection);
    const playlistRouter = require("./routes/playlist")(playlistCollection);
    const videosRouter = require("./routes/videos")(videosCollection);
    const documentCategoryRouter = require("./routes/document-category")(
      documentCategoryCollection
    );
    const documentsRouter = require("./routes/document")(documentCollection);
    const teacherLessonRouter = require("./routes/teacher-lessons")(
      teacherLessonsCollection
    );
    const assignmentRouter = require("./routes/assignments")(
      assignmentsCollection
    );
    const sectionRouter = require("./routes/section")(sectionCollection);
    const subjectsRouter = require("./routes/subjects")(subjectsCollection);
    const sessionRouter = require("./routes/sessions")(sessionCOllection);
    const batchRouter = require("./routes/batches")(batchCollection);
    const classReportRouter = require("./routes/classreports")(
      classReportCollection
    );
    const gradingRouter = require("./routes/examination/grading")(
      gradingCollection
    );
    const examRoutineRouter = require("./routes/examination/exam-routine")(
      examRoutineCollection
    );
    const examRouter = require("./routes/examination/exam")(examCollection);
    const examCategoryRouter = require("./routes/exam-category")(
      examCategoryCollecton
    );
    const resultsRouter = require("./routes/examination/results")(
      resultsCollection
    );
    const subjectWiseRouter = require("./routes/examination/subject-wise")(
      subjectWiseCollection
    );
    const excelMarksRouter = require("./routes/examination/excel-marks")(
      excelMarksCollection
    );
    const bankAccountsRouter = require("./routes/accountant/bank-account")(
      bankAccountCollection
    );
    const incomeSourceRouter = require("./routes/accountant/income-source")(
      incomeSourceCollection
    );
    const expenseHeadRouter = require("./routes/accountant/expense-head")(
      expenseHeadCollection
    );
    const expenseCategoryRouter =
      require("./routes/accountant/expense-category")(
        expenseCategoryCollection
      );
    const paymentTypeRouter = require("./routes/accountant/payment-type")(
      paymentTypeCollection
    );
    const incomeRouter = require("./routes/accountant/income")(
      incomeCollection
    );
    const expensesRouter = require("./routes/accountant/expenses")(
      expensesCollection
    );
    const annualReportsRouter = require("./routes/homePristha/annual-reports")(
      annualReportsCollection
    );
    const contactROuter = require("./routes/homePristha/contact")(
      contactCollection
    );
    const classRouter = require("./routes/class/class")(classCollection);
    const classTeacherRouter = require("./routes/class/class-teacher")(
      classTeacherCollection
    );
    const dividePathokromRouter = require("./routes/class/divide-pathokrom")(
      dividePathokromCollectin
    );
    const migrateStatusRouter = require("./routes/students/migrate-status")(
      migrateStatusCollection,
      studentsCollection
    );
    const migrateBranchesRouter = require("./routes/students/migrate-branches")(
      migrateBranchesCollection
    );
    const studentLeaveRouter = require("./routes/students/student-leave")(
      studentLeaveCollection,
      studentsCollection
    );
    const fineTypeRouter = require("./routes/fees/fine-type")(
      fineTypeCollection
    );
    const feeTypeRouter = require("./routes/fees/fee-type")(feeTypeCollection);
    const discountRouter = require("./routes/fees/discount")(
      discountCollection
    );
    const feeRouter = require("./routes/fees/fee")(feeCollection);
    const addDiscountRouter = require("./routes/fees/add-discount")(
      addDiscountCollection
    );
    const assignFinesRouter = require("./routes/fees/assign-fines")(
      assignFinesCollection
    );
    const feeSettingsRouter = require("./routes/fees/fee-settings")(
      feeSettingsCollection
    );
    const expenseItemsRouter = require("./routes/hisab/expense-items")(
      expenseItemCollection
    );
    const smartAttendanceRouter =
      require("./routes/Attendance/smart-attendance")(
        smartAttendanceCollection
      );
    const smartAttendanceShiftRouter =
      require("./routes/Attendance/smart-attendance-shift")(
        smartAttendanceShiftCollection
      );
    const holidaysRouternew = require("./routes/Attendance/holiday")(
      holidaysCollection
    );
    const holidayTypeRouter = require("./routes/Attendance/holiday-type")(
      holidayTypeCollection
    );
    const teacherLeaveRouter = require("./routes/Attendance/teacher-leave")(
      teacherLeaveCollection,
      teachersListCollection
    );
    const employeeLeaveRouter = require("./routes/Attendance/employee-leave")(
      employeeLeaveCollection
    );
    const examGroupRouter = require("./routes/examination/exam-group")(
      examGroupCollection
    );
    const examHallRouter = require("./routes/seatplan/exam-hall")(
      examHallCollection
    );
    const examTimeTableRouter = require("./routes/seatplan/exam-timetable")(
      examTimeTableCollection
    );
    const examArrangementRouter = require("./routes/seatplan/exam-arrangement")(
      examArrangementCollection
    );
    const combinedResultRouter = require("./routes/results/combined-result")(
      combinedResultCollection
    );
    const resultSheetRouter = require("./routes/results/result-sheet")(
      resultSheetCollection
    );
    const sendsmsCollectionRouter = require("./routes/sms/send-instant-sms")(
      sendsmsCollection
    );
    const smsBalanceRouter = require("./routes/sms/smsBalanceRoutes")(
      smsBalanceCollection,
      smsPurchaseCollection
    );
    const instituteMessageRouter =
      require("./routes/institute/institute-messages")(
        instituteMessageCollection
      );
    const contactMainRouter = require("./routes/institute/contact-main")(
      contactMainCollection
    );
    const instituteServicesRouter =
      require("./routes/institute/institute-services")(
        instituteServicesCollection
      );
    const instituteJobsRouter = require("./routes/institute/institute-jobs")(
      instituteJobsCollection
    );
    const blogCategoryRouter = require("./routes/prokasona/blog-category")(
      blogCategoryCollection
    );
    const mainAdmissionInfoRouter =
      require("./routes/admission/main-admission-info")(
        mainAdmissionInfoCollection
      );
    const onlineApplicationsRouter = require("./routes/admission/online-applications") (onlineApplicationsCollection);
    const facultyRouter = require("./routes/onusod/faculty") (facultyCollection);
    const depertmentRouter = require("./routes/onusod/depertment") (depertmentCollection);
    const instituteMediaRouter = require("./routes/instituteMedia/institute-media") (instituteMediaCollection);
    const instituteVideoRouter = require("./routes/instituteMedia/institute-video") (instituteVideoCollection);
    const basicSettingsRouter = require("./routes/settings/basic-settings") (basicSettingsCollection);

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
    app.use("/api/branches", branchesRouter);
    app.use("/api/donation", donationRouter);
    app.use("/api/certificate", certificateRouter);
    app.use("/api/salary-types", salaryTypeRouter);
    app.use("/api/institute-info", instituteInfoRouter);
    app.use("/api/admin-contact", adminContactRouter);
    app.use("/api/events", eventRouter);
    app.use("/api/facilities", facilitiesRouter);
    app.use("/api/social-links", socialLinksRouter);
    app.use("/api/privacy-policy", privacyPolicyRouter);
    app.use("/api/authors", authorsRouter);
    app.use("/api/menus", menuRouter);
    app.use("/api/pages", pagesRouter);
    app.use("/api/playlists", playlistRouter);
    app.use("/api/videos", videosRouter);
    app.use("/api/document-categories", documentCategoryRouter);
    app.use("/api/documents", documentsRouter);
    app.use("/api/teacher-lessons", teacherLessonRouter);
    app.use("/api/assignments", assignmentRouter);
    app.use("/api/sections", sectionRouter);
    app.use("/api/subjects", subjectsRouter);
    app.use("/api/sessions", sessionRouter);
    app.use("/api/batches", batchRouter);
    app.use("/api/class-report", classReportRouter);
    app.use("/api/grading", gradingRouter);
    app.use("/api/exam-routine", examRoutineRouter);
    app.use("/api/exams", examRouter);
    app.use("/api/exam-categories", examCategoryRouter);
    app.use("/api/results", resultsRouter);
    app.use("/api/subject-wise", subjectWiseRouter);
    app.use("/api/excel-marks", excelMarksRouter);
    app.use("/api/bank-accounts", bankAccountsRouter);
    app.use("/api/income-sources", incomeSourceRouter);
    app.use("/api/expense-heads", expenseHeadRouter);
    app.use("/api/expense-category", expenseCategoryRouter);
    app.use("/api/payment-types", paymentTypeRouter);
    app.use("/api/incomes", incomeRouter);
    app.use("/api/expenses", expensesRouter);
    app.use("/api/annual-reports", annualReportsRouter);
    app.use("/api/contact", contactROuter);
    app.use("/api/class", classRouter);
    app.use("/api/class-teachers", classTeacherRouter);
    app.use("/api/divide-pathokrom", dividePathokromRouter);
    app.use("/api/migrate-status", migrateStatusRouter);
    app.use("/api/migrate-branches", migrateBranchesRouter);
    app.use("/api/student-leave", studentLeaveRouter);
    app.use("/api/fine-types", fineTypeRouter);
    app.use("/api/fee-types", feeTypeRouter);
    app.use("/api/discount", discountRouter);
    app.use("/api/fee", feeRouter);
    app.use("/api/discounts", addDiscountRouter);
    app.use("/api/assign-fines", assignFinesRouter);
    app.use("/api/fee-settings", feeSettingsRouter);
    app.use("/api/expense-items", expenseItemsRouter);
    app.use("/api/smart-attendance", smartAttendanceRouter);
    app.use("/api/smart-attendance-shift", smartAttendanceShiftRouter);
    app.use("/api/holidays", holidaysRouternew);
    app.use("/api/holiday-type", holidayTypeRouter);
    app.use("/api/teacher-leave", teacherLeaveRouter);
    app.use("/api/employee-leave", employeeLeaveRouter);
    app.use("/api/exam-group", examGroupRouter);
    app.use("/api/exam-hall", examHallRouter);
    app.use("/api/exam-timetable", examTimeTableRouter);
    app.use("/api/seat-arrangement", examArrangementRouter);
    app.use("/api/combined-result", combinedResultRouter);
    app.use("/api/result-sheet", resultSheetRouter);
    app.use("/api/sms", sendsmsCollectionRouter);
    app.use("/api/sms-balance", smsBalanceRouter);
    app.use("/api/institute-messages", instituteMessageRouter);
    app.use("/api/contact-main", contactMainRouter);
    app.use("/api/institute-services", instituteServicesRouter);
    app.use("/api/institute-jobs", instituteJobsRouter);
    app.use("/api/blog-category", blogCategoryRouter);
    app.use("/api/main-admission-info", mainAdmissionInfoRouter);
    app.use("/api/online-applications", onlineApplicationsRouter);
    app.use("/api/faculty", facultyRouter);
    app.use("/api/depertment", depertmentRouter);
    app.use("/api/institute-media", instituteMediaRouter);
    app.use("/api/institute-video", instituteVideoRouter);
    app.use("/api/basic-settings", basicSettingsRouter);

    // Health check route
    app.get("/health", (req, res) => {
      res.status(200).json({
        status: "OK",
        message: "Server is running smoothly",
        timestamp: new Date().toISOString(),
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
            sliders: slidersCount,
          },
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Database connection failed",
          error: error.message,
        });
      }
    });

    // Handle undefined routes
    app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: "Route not found",
        path: req.originalUrl,
      });
    });

    // Error handling middleware
    app.use((error, req, res, next) => {
      console.error("Error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Something went wrong",
      });
    });

    // Start server after MongoDB connection
    app.listen(port, () => {
      console.log(`School management API is running on port ${port}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

// Run the async function
run().catch(console.dir);
