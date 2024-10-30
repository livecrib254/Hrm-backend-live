import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import { pool } from "./db/db.mjs";
import bcrypt from "bcrypt";
import getRoutes from "./routes/getRoutes.mjs";
import postRoutes from "./routes/postRoutes.mjs";
import deleteRoutes from "./routes/deleteRoutes.mjs";
import putRoutes from "./routes/putRoutes.mjs";
import processbulkpayroll from "./routes/payroll.mjs";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import resetPassword from "./routes/resetPassword.mjs";

const app = express();
const port = 5174;
const hostname = "0.0.0.0";
const saltRounds = 10; // Number of salt rounds

// Convert import.meta.url to a file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(bodyParser.json());
app.use("/api", getRoutes);
app.use("/api", postRoutes);
app.use("/api", deleteRoutes);
app.use("/api", putRoutes);
app.use("/api", resetPassword);
app.use("/api", processbulkpayroll);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, ".", "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // Absolute path to uploads directory
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// Configure multer with storage, file filter, and size limits
const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|pdf/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Error: File type not supported!"));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
});

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files from the uploads directory
app.use("/uploads", express.static(uploadDir));

/////////////////////////////////// PUT  //////////////////////////////////

app.put("/warningsupload", upload.array("file"), async (req, res) => {
  try {
    const files = req.files;
    let filePaths = [];
    const { employeeId, employeeName, description, date } = req.body;
      console.log(employeeId, employeeName, description, date)
    if (files) {
      filePaths = files.map((file) => {
        return `uploads/${file.filename}`;
      }); // Normalize file paths
      console.log("Uploaded file paths:", filePaths);
    }

    if (!files || files.length === 0) {
      console.error("No files uploaded.");
      // return res.status(400).json({ message: "No files uploaded." });
    }
    const id = await pool.query(
      "SELECT id FROM employees WHERE employee_number = $1",
      [employeeId]
    );

    console.log(id);

    if (id.rows[0].id) {
      // Create the warning object
      const warning = {
        employeeName,
        employeeId,
        description,
        date,
        files: filePaths, // Array of file paths
      };

      // Insert into PostgreSQL (example using pg library)
      const query = `
      INSERT INTO warnings (employee_id, description, issue_date, attachments)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
      const values = [
        id.rows[0].id,
        warning.description,
        warning.date,
        warning.files, // Convert array to JSON string
      ];

      const result = await pool.query(query, values);
      console.log(result.rows);
      res.status(200).json({ message: "Warning issued successfully" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error issuing warning" });
  }
});

/////////////////SERVER START/////////////////////
app.listen(port, hostname, () => {
  console.log(`Example app listening on port ${port} on ${hostname}`);
});
