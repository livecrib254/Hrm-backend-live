import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import nodemailer from "nodemailer";
import crypto from "crypto";

const router = express.Router();

// Configure your email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

router.post("/reset-password", async (req, res) => {
  const { email } = req.body;
  console.log(req.body);

  try {
    // Generate a unique token
    const token = crypto.randomBytes(20).toString("hex");
    console.log(token);
    // TODO: Save the token in your database along with the user's email and an expiration time

    // Create reset password link
    const resetLink = `https://your-hrms-frontend.com/reset-password?token=${token}`;

    // Send email
    await transporter.sendMail({
      from: "your-email@gmail.com",
      to: email,
      subject: "HRMS Password Reset",
      html: `
        <p>You requested a password reset for your HRMS account.</p>
        <p>Please click the following link to reset your password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });

    res.json({ message: "Password reset link sent to your email." });
  } catch (error) {
    console.error("Password reset error:", error);
    res
      .status(500)
      .json({ error: "An error occurred while processing your request." });
  }
});

export default router;
