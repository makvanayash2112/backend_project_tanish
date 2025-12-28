const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
// const v1Router = express.Router();
const serverless = require("serverless-http");

console.log("Connecting to MongoDB...");


const userAuthRoutes = require("./routes/userAuthRoutes");
const userRoutes = require("./routes/userRoutes");

console.log("Setting up middlewares...");


app.use(cors());

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));


app.use("/admin", userAuthRoutes);
app.use("/user", userRoutes);



app.use("/check", (req, res) => {
    res.json({ message: "API checkPage" });
});
app.use("/", (req, res) => {
    console.log("hello from homepage");

    res.json({ message: "API Homepage" });
});

console.log("Setting up error handling...");

// ------------------- DB CONNECT -------------------
let cachedConnection = null;

const connectToDatabase = async () => {
    // Check if connection exists AND is actually working
    if (cachedConnection && mongoose.connection.readyState === 1) {
        console.log("♻️ Using cached MongoDB connection");
        return cachedConnection;
    }

    try {
        // Close any stale connections
        if (mongoose.connection.readyState !== 0) {
            console.log("🔄 Closing stale connection...");
            await mongoose.connection.close();
        }

        console.log("MongoDB URL log:", process.env.MONGO_URL);

        // Optimized settings for AWS Lambda
        const connection = await mongoose.connect(process.env.MONGO_URL, {
            maxPoolSize: 10, // Lower pool size for Lambda (not 200!)
            minPoolSize: 1, // Keep it minimal
            serverSelectionTimeoutMS: 10000, // Increase timeout
            socketTimeoutMS: 45000, // Socket timeout
            connectTimeoutMS: 10000, // Connection timeout
            retryWrites: true,
            retryReads: true,
            maxIdleTimeMS: 10000, // Close idle connections faster
            // Disable buffering - fail fast instead of queuing
            bufferCommands: false,
        });

        cachedConnection = connection;
        console.log("✅ MongoDB connected successfully");
        return connection;
    } catch (err) {
        console.error("❌ Database connection failed:", err);
        cachedConnection = null;
        throw err;
    }
};

// ------------------- CRITICAL: Context settings -------------------
// Tell Lambda not to wait for empty event loop
if (process.env.NODE_ENV === "serverless") {
    app.use((req, res, next) => {
        // This is crucial for Lambda
        if (typeof context !== "undefined") {
            context.callbackWaitsForEmptyEventLoop = false;
        }
        next();
    });
}

// ------------------- SOCKET HANDLER -------------------
const http = require("http");

// ------------------- START APP -------------------
(async () => {
    try {
        await connectToDatabase();

        // ✅ Local/dev mode: Start HTTP + Socket.IO
        if (process.env.NODE_ENV !== "serverless") {
            const PORT = process.env.PORT || 3000;
            const server = http.createServer(app);

            server.listen(PORT, () =>
                console.log(`🚀 Server running on http://localhost:${PORT}`)
            );
        }
    } catch (err) {
        console.error("Startup Error:", err);
    }
})();

// ------------------- SERVERLESS EXPORT -------------------
module.exports.handler = serverless(async (event, context) => {
    // CRITICAL: Prevent Lambda from waiting for connections to close
    context.callbackWaitsForEmptyEventLoop = false;

    try {
        await connectToDatabase();
        return app(event, context);
    } catch (error) {
        console.error("Lambda handler error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal server error" }),
        };
    }
});
