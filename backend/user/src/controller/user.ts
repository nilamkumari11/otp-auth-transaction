/**
 * user.ts controller
 */

import TryCatch from "../config/TryCatch.js";
import { redisClient } from "../index.js";
import { User } from "../model/User.js";
import { generateToken } from "./generateToken.js";
import type { AuthenticatedRequest } from "../middleware/isAuth.js";
import type { Response, Request } from "express";
import {
  createOTP,
  verifyOTP,
  isOnResendCooldown,
  setResendCooldown,
} from "../services/otpService.js";
import {
  resolveChannels,
  publishOTPDelivery,
  publishSecurityAlert,
  type OTPChannel,
} from "../services/deliveryService.js";
import { assessGeoRisk, type GeoRiskResult } from "../services/geoService.js";
import {
  checkLoginRateLimit,
  checkVerifyRateLimit,
  extractClientIP,
} from "../services/securityService.js";


// ✅ Proper Type
type AnalyticsType = {
  totalOTPGenerated: number;
  totalVerified: number;
  failedAttempts: number;
  blockedUsers: number;
  averageDeliveryTime: number;
  riskyLogins: number;
  dailyOTPData: Record<string, number>;
  blockedUserTrend: Record<string, number>;
  deliveryTimes: number[];
};

// ─── Analytics ────────────────────────────────────────────────────────────────
export const analytics: AnalyticsType = {
  totalOTPGenerated: 0,
  totalVerified: 0,
  failedAttempts: 0,
  blockedUsers: 0,
  averageDeliveryTime: 0,
  riskyLogins: 0,
  dailyOTPData: {},
  blockedUserTrend: {},
  deliveryTimes: [],
};

// ─── Login ─────────────────────────────────────────────────────────────────────
export const loginUser = TryCatch(async (req: Request, res: Response) => {
  const {
    email,
    phoneNumber,
    accountNumber,
    password,
    preferredChannel,
    isAdminLogin,
  } = req.body;

  const clientIP = extractClientIP(req as any);

  // ✅ Validation
  if (isAdminLogin) {
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required for admin login",
      });
    }
  } else {
    if (!email || !phoneNumber || !accountNumber || !password) {
      return res.status(400).json({
        message:
          "Email, phone number, account number, and password are all required",
      });
    }
  }

  // ── Rate limit ─────────────────────────────────────────────────────────
  const ipLimit = await checkLoginRateLimit(clientIP);
  if (ipLimit.blocked) {
    return res.status(429).json({
      message: `Too many login attempts. Try again in ${Math.ceil(
        ipLimit.ttlSeconds / 60
      )} minute(s).`,
    });
  }

  // ── Find user ──────────────────────────────────────────────────────────
  const query = email
    ? { email: email.toLowerCase().trim() }
    : accountNumber
    ? { accountNumber: accountNumber.trim() }
    : { phoneNumber: phoneNumber.trim() };

  const user = await User.findOne(query);

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  if (isAdminLogin === true && !user.isAdmin) {
    return res.status(403).json({ message: "Not authorized for admin access" });
  }

  const context = isAdminLogin ? "admin-login" : "login";
  const userId = user._id.toString();

  // ── Cooldown ───────────────────────────────────────────────────────────
  const cooldown = await isOnResendCooldown(userId, context);
  if (cooldown.blocked) {
    return res.status(429).json({
      message: `Please wait ${cooldown.ttlSeconds}s before requesting another OTP.`,
      cooldownSeconds: cooldown.ttlSeconds,
    });
  }

  // ── Geo Risk ───────────────────────────────────────────────────────────
  let geoRisk: GeoRiskResult = {
    riskLevel: "NONE",
    isRisky: false,
    riskReason: null,
    currentLocation: null,
    previousLocation: null,
  };

  try {
    geoRisk = await assessGeoRisk(userId, clientIP);
    if (geoRisk.isRisky) analytics.riskyLogins += 1;
  } catch (e) {
    console.error("Geo risk failed:", e);
  }

  const otpTTL =
    geoRisk.riskLevel === "HIGH"
      ? 120
      : geoRisk.riskLevel === "MEDIUM"
      ? 180
      : 300;

  // ── ✅ FIXED CHANNEL LOGIC + TYPE FIX ──────────────────────────────────
  const baseChannels = resolveChannels(user.phoneNumber ?? undefined, false);

  let channels: OTPChannel[] = [];

  const smsFirst: OTPChannel[] = ["sms", "email", "voice"];
  const emailFirst: OTPChannel[] = ["email", "sms", "voice"];

  if (geoRisk.riskLevel === "HIGH") {
    channels = ["email"]; // secure fallback
  } else if (preferredChannel === "sms") {
    channels = smsFirst.filter((c) => baseChannels.includes(c));
  } else if (preferredChannel === "email") {
    channels = emailFirst.filter((c) => baseChannels.includes(c));
  } else {
    channels = baseChannels;
  }

  // ── Create OTP ─────────────────────────────────────────────────────────
  const { otpId, plainOtp } = await createOTP(
    userId,
    user.email,
    channels,
    context as any,
    otpTTL
  );

  await setResendCooldown(userId, context);

  let body = `Your OTP is ${plainOtp}. Valid for ${Math.round(
    otpTTL / 60
  )} minute(s). Do not share this.`;

  // ── Publish ────────────────────────────────────────────────────────────
  const published = await publishOTPDelivery({
    otpId,
    email: user.email,
    phone: user.phoneNumber ?? undefined,
    otp: plainOtp,
    subject: isAdminLogin ? "Admin OTP" : "Login OTP",
    body,
    channels,
    currentChannelIndex: 0,
    retryCount: 0,
    userName: user.name,
    context,
    location: "Unknown",
    channel: channels[0],
  });

  if (!published) {
    return res.status(500).json({ message: "Failed to send OTP" });
  }

  // ── Analytics ──────────────────────────────────────────────────────────
  analytics.totalOTPGenerated++;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
  });

  analytics.dailyOTPData[today] =
    (analytics.dailyOTPData[today] || 0) + 1;

  return res.status(200).json({
    message: `OTP sent via ${channels[0]}`,
    otpId,
    deliveryChannel: channels[0],
  });
});

// ─── My Profile ─────────────────────────────────────────────
export const myProfile = TryCatch(
  async (req: AuthenticatedRequest, res: Response) => {
    return res.json(req.user);
  }
);

// ─── Get Balance ────────────────────────────────────────────
export const getBalance = TryCatch(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = await User.findById(req.user?._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({ balance: user.balance });
  }
);

// ─── Update Profile ─────────────────────────────────────────
export const updateName = TryCatch(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = await User.findById(req.user?._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (req.body.name) user.name = req.body.name;
    if (req.body.dob !== undefined) user.dob = req.body.dob;

    await user.save();
    const token = generateToken(user);

    return res.json({
      message: "User updated",
      user,
      token,
    });
  }
);

// ─── Get All Users ──────────────────────────────────────────
export const getAllUsers = TryCatch(async (_req, res) => {
  const users = await User.find().select("-password");
  return res.json(users);
});

// ─── Get A User ─────────────────────────────────────────────
export const getAUser = TryCatch(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");
  return res.json(user);
});

// ─── Register ───────────────────────────────────────────────
export const registerUser = TryCatch(async (req: Request, res: Response) => {
  const { name, email, password, phoneNumber } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      message: "name, email, and password are required",
    });
  }

  const existingUser = await User.findOne({
    email: email.toLowerCase().trim(),
  });

  if (existingUser) {
    return res.status(400).json({
      message: "User with this email already exists",
    });
  }

  const accountNumber = `ACC${Date.now()}${Math.floor(
    100 + Math.random() * 900
  )}`;

  const user = await User.create({
    name,
    email,
    password,
    accountNumber,
    phoneNumber,
  });

  return res.status(201).json({
    message: "User registered successfully",
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      accountNumber: user.accountNumber,
      balance: user.balance,
    },
  });
});