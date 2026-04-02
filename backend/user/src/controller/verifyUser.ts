import { redisClient } from "../index.js";
import { User } from "../model/User.js";
import { generateToken } from "./generateToken.js";
import TryCatch from "../config/TryCatch.js";

export const verifyUser = TryCatch(async (req, res) => {
  const { email, otp: enteredOTP } = req.body;

  if (!email || !enteredOTP) {
    res.status(400).json({
      message: "Email and OTP required ",
    });
    return;
  }

  const otpKey = `otp:${email}`;
  const storedOTP = await redisClient.get(otpKey);

  if (!storedOTP || storedOTP !== enteredOTP) {
    res.status(400).json({
      message: "Invalid OTP or expired OTP",
    });
    return;
  }

  await redisClient.del(otpKey);

  let user = await User.findOne({ email }).select("-password");

  if (!user) {
    // User does not exist, prompt for full registration
    res.status(404).json({
      message: "User not found. Please complete your registration.",
      registrationRequired: true,
      email: email,
    });
    return;
  }

  const token = generateToken(user);

  res.json({
    message: "User Verified",
    user,
    token,
  });
});
