const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;

// Configure CORS to allow requests from the frontend origin
app.use(
  cors({
    origin: true, // Sob origin ke allow kore
    credentials: true, // Cookies allow kora
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


app.use(express.json());
app.use(cookieParser());

const user = process.env.USER_DB;
const pass = process.env.USER_PASS;
const uri = `mongodb+srv://${user}:${pass}@cluster0.temrfiu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("MongoDB connected successfully");

    const db = client.db("schoolManagement");
    const usersCollection = db.collection("users");

    // Mount user routes
    app.use("/api/users", require("./routes/users")(usersCollection));
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
  // Note: Do not close the client here to keep the connection open
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("API is running");
});

app.listen(port, () => {
  console.log(`School management API is running on port ${port}`);
});