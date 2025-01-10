import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import { pool } from "../db/db.mjs";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get("/", async (req, res) => {
  // Query SQL (PostgreSQL)
  // const query = "SELECT * FROM employees";
  // const sqlRes = await pool.query(query);

  // console.log(sqlRes.rows);
  // const plainPassword = "hashed_password_2";
  // const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
  // console.log("Hashed Password:", hashedPassword);
  res.json("Hello World");
});

router.get('/employees/:employeeNumber', async (req, res) => {
  const { employeeNumber } = req.params;
     console.log(employeeNumber)
  try {
    const query = "SELECT first_name || ' ' || last_name AS name FROM employees WHERE employee_number = $1;"
    const result = await pool.query( query,
      [employeeNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({ name: result.rows[0].name });
  } catch (error) {
    console.error('Error querying the database:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get("/adminsettings", async (req, res) => {
  try {
    const query = `SELECT 
      users.*, -- Select all columns from the payroll table
      employees.first_name,
       employees.last_name
  FROM 
      users
  JOIN 
      employees
  ON 
       users.employee_id = employees.id;
  `;

    // const query2 = `SELECT * FROM leave_types;`;
    const result = await pool.query(query);
    // const result2 = await pool.query(query2);

    res.json({ users: result.rows });
  } catch (error) {
    console.log(error);
  }
});

router.get("/getemployees", async (req, res) => {
  try {
    const query = `SELECT * FROM employees;
  `;

    const result = await pool.query(query);
    console.log(result.rows);
    res.json(result.rows);
  } catch (error) {
    console.log(error);
  }
});

router.get("/payroll", async (req, res) => {
  try {
    const query = `SELECT 
      payroll_info.*, -- Select all columns from the payroll_info table
      employees.first_name || ' ' || employees.last_name AS name, -- Concatenate first and last name as 'name'
      employees.department,
      employees.position,
      employees.Employee_number
  FROM 
      payroll_info
  JOIN 
      employees 
  ON 
      payroll_info.employee_id = employees.id;
 
  `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.log(error);
  }
});

router.get("/leavebalances", async (req, res) => {
  try {
    const result = await pool.query(`SELECT 
      leave_balances.*, -- Select all columns from the payroll table
      employees.first_name || ' ' || employees.last_name AS name, -- Concatenate first and last name as 'name'
      employees.department,
      employees.position,
      employees.Employee_number
  FROM 
      leave_balances
  JOIN 
      employees 
  ON 
      leave_balances.employee_id = employees.id;
  `);

    res.json({ leaveBalance: result.rows });
  } catch (err) {
    console.log("Error", err);
  }
});

router.get("/download/:filename", (req, res) => {
  const { filename } = req.params;
  console.log(filename);
  const filePath = path.join(__dirname, "../uploads", filename); // Adjust the path as needed

  res.download(filePath, (err) => {
    if (err) {
      console.error("Error downloading file:", err);
      res.status(404).send("File not found");
    }
  });
});

router.get("/leave", async (req, res) => {
  try {
    const result = await pool.query(`SELECT 
    DATE_PART('year', leave_requests.start_date) AS year, -- Extract the year from the start_date column
    leave_requests.*, -- Select all columns from the leave_requests table
    employees.first_name || ' ' || employees.last_name AS name, -- Concatenate first and last name as 'name'
    employees.department, 
    employees.position
FROM 
    leave_requests
JOIN 
    employees 
ON 
    leave_requests.employee_id = employees.id
GROUP BY 
    year, -- Group by the extracted year
    leave_requests.id, -- Include all columns in leave_requests in the GROUP BY
    employees.id -- Include all columns used from employees in the GROUP BY
ORDER BY 
    year;

  `);
    res.json({ leaves: result.rows });
  } catch (err) {
    console.log("Error", err);
  }
});

router.get("/discplinary", async (req, res) => {
  try {
    const result = await pool.query(`SELECT 
    DATE_PART('year', disciplinary_cases.created_at) AS year, -- Extract the year from the date_reported column
    disciplinary_cases.*, -- Select all columns from the disciplinary_cases table
    employees.first_name || ' ' || employees.last_name AS name, -- Concatenate first and last name as 'name'
    employees.department, 
    employees.position
FROM 
    disciplinary_cases
JOIN 
    employees 
ON 
    disciplinary_cases.employee_id = employees.id
GROUP BY 
    year, -- Group by the extracted year
    disciplinary_cases.id, -- Include all columns in disciplinary_cases in the GROUP BY
    employees.id -- Include all columns used from employees in the GROUP BY
ORDER BY 
    year;

  `);
    res.json({ cases: result.rows });
  } catch (err) {
    console.log("Error", err);
  }
});

router.get("/staffreq", async (req, res) => {
  console.log(req.body);
  try {
    const result = await pool.query(`SELECT 
    DATE_PART('year', staff_requisitions.created_at) AS year, -- Extract the year from the date_requested column
    staff_requisitions.*, -- Select all columns from the staff_requisitions table
    employees.first_name || ' ' || employees.last_name AS name, -- Concatenate first and last name as 'name'
    employees.department, 
    employees.position
FROM 
    staff_requisitions
JOIN 
    employees 
ON 
    staff_requisitions.requester_id = employees.id
GROUP BY 
    year, -- Group by the extracted year
    staff_requisitions.id, -- Include all columns from staff_requisitions in the GROUP BY
    employees.id -- Include all columns used from employees in the GROUP BY
ORDER BY 
    year;

  `);

    res.json({ staffReq: result.rows });
  } catch (err) {
    console.log("Error", err);
  }
});

router.get("/attendance", async (req, res) => {
  try {
    const result = await pool.query(`SELECT 
      attendance.id, 
      attendance.employee_id, 
      TO_CHAR(attendance.date::date, 'YYYY-MM-DD') AS formatted_date, -- Format the date
      attendance.check_in, 
      attendance.check_out, 
      attendance.status,
      employees.first_name || ' ' || employees.last_name AS name, -- Concatenate first and last name as 'name'
      employees.department, 
      employees.position
  FROM 
      attendance
  JOIN 
      employees 
  ON 
      attendance.employee_id = employees.id;
  
  `);

    res.json({ attendanceData: result.rows });
  } catch (err) {
    console.log("Error", err);
  }
});

router.get("/warnings", async (req, res) => {
  try {
    const result = await pool.query(`SELECT
       warnings.id,
    warnings.employee_id,
    warnings.type_id,
    warnings.description,
    warnings.issue_date,
    warnings.expiry_date,
    warnings.attachments,
    warnings.issuer_id,
    warnings.status,
    warnings.created_at,
    warnings.updated_at,
      employees.first_name || ' ' || employees.last_name AS name, -- Concatenate first and last name as 'name'
      employees.department, 
      employees.position,
      employees.Employee_Number
  FROM 
      warnings
  JOIN 
      employees 
  ON 
        warnings.employee_id = employees.id;
  `);

    res.json({ warnings: result.rows });
  } catch (err) {
    console.log("Error", err);
  }
});

// Employee search endpoint
router.get("/employees", async (req, res) => {
  const { search } = req.query;

  if (!search || search.length < 3) {
    return res
      .status(400)
      .json({ error: "Search term must be at least 3 characters long" });
  }

  try {
    const query = `
        SELECT id, first_name, last_name, Employee_number
        FROM employees
        WHERE LOWER(first_name) LIKE LOWER($1)
        LIMIT 10
      `;
    const values = [`%${search}%`];

    const result = await pool.query(query, values);
    console.log(result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error("Error searching employees:", error);
    res
      .status(500)
      .json({ error: "An error occurred while searching for employees" });
  }
});

// Fetch all recognition records
router.get("/recognitions", async (req, res) => {
  try {
    const query = `
    SELECT 
      rh.*, 
      e.first_name || ' ' || e.last_name AS recipient_name
    FROM recognition_history rh
    JOIN employees e ON rh.recipient_id = e.id
  `;
    // Query to fetch all records from the recognition_history table
    const result = await pool.query(query);

    // If no records are found, return a 404
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No recognition history found' });
    }

    // Send the data back as JSON
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recognition history:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


export default router;
