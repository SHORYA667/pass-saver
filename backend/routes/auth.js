const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

const router = express.Router();

const jwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing from backend/.env");
  }

  return process.env.JWT_SECRET;
};

const publicUser = (user) => ({
  _id: user._id,
  fullName: user.fullName,
  username: user.username,
  email: user.email,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        success: false,
        message: "Authorization token required",
      });
    }

    const payload = jwt.verify(token, jwtSecret());
    const user = await User.findById(payload.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}

router.post("/signup", async (req, res) => {
  try {
    const fullName = req.body.fullName?.trim();
    const username = req.body.username?.trim().toLowerCase();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    // #region agent log
    fetch("http://127.0.0.1:7729/ingest/1f7d9069-6476-45fe-9bb9-faf6ddca8657", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "213814",
      },
      body: JSON.stringify({
        sessionId: "213814",
        location: "auth.js:signup:entry",
        message: "Signup attempt",
        data: {
          hasFullName: !!fullName,
          hasUsername: !!username,
          hasEmail: !!email,
          hasPassword: !!password,
        },
        timestamp: Date.now(),
        hypothesisId: "A",
      }),
    }).catch(() => {});
    // #endregion

    if (!fullName || !username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      username,
      email,
      password: hashedPassword,
    });

    // #region agent log
    fetch("http://127.0.0.1:7729/ingest/1f7d9069-6476-45fe-9bb9-faf6ddca8657", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "213814",
      },
      body: JSON.stringify({
        sessionId: "213814",
        location: "auth.js:signup:created",
        message: "User created in MongoDB",
        data: { userId: String(user._id), email: user.email },
        timestamp: Date.now(),
        hypothesisId: "A",
      }),
    }).catch(() => {});
    // #endregion

    const token = jwt.sign({ id: user._id }, jwtSecret(), {
      expiresIn: "7d",
    });

    res.status(201).json({
      success: true,
      message: "Account Created Successfully",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Signup Error:", error);

    // #region agent log
    fetch("http://127.0.0.1:7729/ingest/1f7d9069-6476-45fe-9bb9-faf6ddca8657", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "213814",
      },
      body: JSON.stringify({
        sessionId: "213814",
        location: "auth.js:signup:error",
        message: "Signup failed",
        data: { errorMessage: error.message },
        timestamp: Date.now(),
        hypothesisId: "A",
      }),
    }).catch(() => {});
    // #endregion

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const identifier = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    // #region agent log
    fetch("http://127.0.0.1:7729/ingest/1f7d9069-6476-45fe-9bb9-faf6ddca8657", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "213814",
      },
      body: JSON.stringify({
        sessionId: "213814",
        location: "auth.js:login:entry",
        message: "Login attempt",
        data: {
          identifier: identifier || null,
          hasPassword: !!password,
          bodyKeys: Object.keys(req.body || {}),
        },
        timestamp: Date.now(),
        hypothesisId: "A",
      }),
    }).catch(() => {});
    // #endregion

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Username/email and password are required",
      });
    }

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    }).select("+password");

    // #region agent log
    fetch("http://127.0.0.1:7729/ingest/1f7d9069-6476-45fe-9bb9-faf6ddca8657", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "213814",
      },
      body: JSON.stringify({
        sessionId: "213814",
        location: "auth.js:login:query",
        message: "User lookup result",
        data: {
          found: !!user,
          userId: user ? String(user._id) : null,
          hasPasswordField: !!user?.password,
        },
        timestamp: Date.now(),
        hypothesisId: "B",
      }),
    }).catch(() => {});
    // #endregion

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    // #region agent log
    fetch("http://127.0.0.1:7729/ingest/1f7d9069-6476-45fe-9bb9-faf6ddca8657", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "213814",
      },
      body: JSON.stringify({
        sessionId: "213814",
        location: "auth.js:login:password",
        message: "Password compare",
        data: { validPassword },
        timestamp: Date.now(),
        hypothesisId: "C",
      }),
    }).catch(() => {});
    // #endregion

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }

    const token = jwt.sign({ id: user._id }, jwtSecret(), {
      expiresIn: "7d",
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Login Error:", error);

    // #region agent log
    fetch("http://127.0.0.1:7729/ingest/1f7d9069-6476-45fe-9bb9-faf6ddca8657", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "213814",
      },
      body: JSON.stringify({
        sessionId: "213814",
        location: "auth.js:login:catch",
        message: "Login server error",
        data: { errorMessage: error.message, errorName: error.name },
        timestamp: Date.now(),
        hypothesisId: "D",
      }),
    }).catch(() => {});
    // #endregion

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

router.get("/me", authRequired, (req, res) => {
  res.status(200).json({
    success: true,
    user: publicUser(req.user),
  });
});

router.put("/profile", authRequired, async (req, res) => {
  try {
    const fullName = req.body.fullName?.trim();
    const username = req.body.username?.trim().toLowerCase();
    const email = req.body.email?.trim().toLowerCase();

    if (!fullName || !username || !email) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
      _id: { $ne: req.user._id },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Username or email already in use",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { fullName, username, email },
      { new: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      message: "Profile updated",
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

router.put("/profile/password", authRequired, async (req, res) => {
  try {
    const currentPassword = req.body.currentPassword;
    const newPassword = req.body.newPassword;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const user = await User.findById(req.user._id).select("+password");

    const validPassword = await bcrypt.compare(currentPassword, user.password);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Incorrect current password",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Password update error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

module.exports = router;
module.exports.authRequired = authRequired;
