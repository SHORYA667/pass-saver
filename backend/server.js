const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, ".env"),
});

const Password = require("./models/password");
const authRoutes = require("./routes/auth");
const { authRequired } = authRoutes;

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Root Route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "PassSaver Backend API is Running 🚀",
  });
});

// Auth Routes
app.use("/api", authRoutes);

// Health Check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend Running Successfully",
  });
});

//
// ==============================
// PASSWORD ROUTES
// ==============================
//

// Save Password
app.post("/api/passwords", authRequired, async (req, res) => {
  try {
    const { website, url, username, password, notes } = req.body;
    const userId = req.user._id;

    // #region agent log

    if (!website || !username || !password) {
      return res.status(400).json({
        success: false,
        message: "Website, username, and password are required",
      });
    }

    const newPassword = await Password.create({
      userId,
      website,
      url: url || "",
      username,
      password,
      notes: notes || "",
    });

    // #region agent log

    res.status(201).json({
      success: true,
      message: "Password Saved Successfully",
      data: newPassword,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get All Passwords of a User
app.get("/api/passwords", authRequired, async (req, res) => {
  try {
    const passwords = await Password.find({
      userId: req.user._id,
    }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      data: passwords,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Update Password
app.put("/api/passwords/:id", authRequired, async (req, res) => {
  try {
    const existing = await Password.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Password entry not found",
      });
    }

    const { website, url, username, password, notes } = req.body;

    existing.website = website ?? existing.website;
    existing.url = url ?? existing.url;
    existing.username = username ?? existing.username;
    if (password) existing.password = password;
    existing.notes = notes ?? existing.notes;

    await existing.save();

    res.json({
      success: true,
      data: existing,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Delete Password
app.delete("/api/passwords/:id", authRequired, async (req, res) => {
  try {
    const deleted = await Password.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Password entry not found",
      });
    }

    res.json({
      success: true,
      message: "Password Deleted Successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

//
// ==============================
// START SERVER
// ==============================
//

const PORT = process.env.PORT || 8000;

async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from backend/.env");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ MongoDB Connected");

    app.listen(PORT, () => {
      console.log(`🚀 Server Running on Port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
