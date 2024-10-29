import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import { pool } from "../db/db.mjs";

const router = express.Router();

router.delete("/deletewarning", async (req, res) => {
  try {
    const warningId = req.body.id;
    console.log("Deleting warning with ID:", warningId);

    const result = await pool.query(`DELETE FROM warnings WHERE id = $1`, [
      warningId,
    ]);

    if (result.rowCount > 0) {
      res.json({ message: "Warning deleted successfully" });
    } else {
      res.status(404).json({ message: "Warning not found" });
    }
  } catch (error) {
    console.error("Error deleting warning:", error);
    res.status(500).json({
      message: "An error occurred while deleting the warning",
      error: error.message,
    });
  }
});

router.delete("/deleteuser", async (req, res) => {
  try {
    const userId = req.body.userId;
    console.log("Deleting user with ID:", userId);

    const result = await pool.query(`DELETE FROM users WHERE id = $1`, [
      userId,
    ]);

    if (result.rowCount > 0) {
      console.log("user deleted")
     return  res.json({ message: "User deleted successfully" });
    } else {
      console.log("delete failed")
    return  res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      message: "An error occurred while deleting the user",
      error: error.message,
    });
  }
});

router.delete("/deleteemployee", async (req, res) => {
  try {
    console.log("Deleting Employee with ID:", req.body.employeeId);

    const result = await pool.query(`DELETE FROM employees WHERE id = $1`, [
      req.body.employeeId,
    ]);

    if (result.rowCount > 0) {
      res.json({ message: "UEmployee deleted successfully" });
    } else {
      res.status(404).json({ message: "Employee not found" });
    }
  } catch (error) {
    console.error("Error deleting Employee:", error);
    res.status(500).json({
      message: "An error occurred while deleting the Employee",
      error: error.message,
    });
  }
});

export default router;
