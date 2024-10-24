import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import nodemailer from "nodemailer";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { pool } from "../db/db.mjs";
import bcrypt from "bcrypt";

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

router.post("/forgotpassword", async (req, res) => {
  const { email } = req.body;
  console.log(email);
  try {
    // TODO: Save the token in your database along with the user's email and an expiration time
    const result = await pool.query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0)
      return res.status(404).json({ message: "User not found" });

    const userId = result.rows[0].id;

    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now

    // Generate a unique token
    const token = jwt.sign({ userId }, process.env.SECRET_KEY, {
      expiresIn: "1h",
    });

    await pool.query(
      "UPDATE users set resetPasswordToken = $1, reset_password_expires = $2 where id = $3",
      [token, expiresAt, userId]
    );

    const resetLink = `https://hrmlive.livecrib.pro/forgotpassword?token=${token}`;

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

// Handle password reset
router.post("/resetpassword", async (req, res) => {
  const { token, newPassword } = req.body;
  console.log(token, newPassword);
  try {
    jwt.verify(token, process.env.SECRET_KEY, async function (err, foundUser) {
      if (err) {
        if (err.message === "jwt expired") {
          res.json({ message: "token expired" });
        }
      }
      if (foundUser) {
        console.log(foundUser.userId);
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
          hashedPassword,
          foundUser.userId,
        ]);

        res.status(200).json({ message: "Password reset successful" });
      }
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Token expired" });
    }
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
