import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import { pool } from "../db/db.mjs";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import { getNextEmployeeNumber } from "../util/helpers.mjs";

const router = express.Router();
const saltRounds = 10; // Number of salt rounds

// Configure your email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Step 1: Query the user by email
    const query = "SELECT * FROM users WHERE email = $1";
    const userResult = await pool.query(query, [email]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User does not exist" });
    }

    const user = userResult.rows[0];

    // Step 2: Check if the submitted password matches the registration_pass
    const isRegistrationPassMatch = await bcrypt.compare(
      password,
      user.registration_pass || ""
    );

    if (isRegistrationPassMatch) {
      return res.status(200).json({
        message: "Please reset your Registration Password, Redirecting...",
        status: 200,
      });
    }

    // Step 3: Check if the submitted password matches the user's current password (password_hash)
    const isPasswordMatch = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordMatch) {
      return res
        .status(401)
        .json({ message: "Incorrect Password", status: 401 });
    }

    // Step 4: Query the employees table using the employee_id from the users table
    const employeeQuery = "SELECT * FROM employees WHERE id = $1";
    const employeeResult = await pool.query(employeeQuery, [user.employee_id]);

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const employee = employeeResult.rows[0];
    const name = `${employee.first_name} ${employee.last_name}`;
    const nextEmployeeNo = await getNextEmployeeNumber();
    //console.log("Employee>>", employee);
    // Step 5: If the password matches, generate a JWT token and send it in the response
    const token = jwt.sign(
      {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          employee: employee,
          name: name, // Include employee's full name
          nextEmployeeNo: nextEmployeeNo,
        },
      },
      process.env.SECRET_KEY,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      message: "Logged in successfully",
      token: token,
      name: name, // Send the full name in the response
    });
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).json({
      message: "An error occurred during login",
      error: error.message,
    });
  }
});

router.post("/verifyToken", async (req, res) => {
  jwt.verify(
    req.body.token,
    process.env.SECRET_KEY,
    async function (err, foundUser) {
      if (err) {
        if (err.message === "jwt expired") {
          res.json({ message: "token expired" });
        }
      }
      if (foundUser) {
        console.log("founduser", foundUser.role);
        res.json({
          message: "token is good",
          role: foundUser.role,
          user: foundUser.user,
        });
      }
    }
  );
});

router.post("/dashboardData", async (req, res) => {
  jwt.verify(
    req.body.token,
    process.env.SECRET_KEY,
    async function (err, foundUser) {
      if (err) {
        if (err.message === "jwt expired") {
          res.json({ message: "token expired" });
        }
      }
      if (foundUser) {
        const totalEmployees = await pool.query(
          "SELECT COUNT(*) FROM employees"
        );
        const totalPayroll = await pool.query(
          "SELECT SUM(gross_pay) FROM payroll"
        );

        const leaveRequests = await pool.query(
          "SELECT COUNT(*) FROM leave_requests WHERE status = $1",
          ["pending"]
        );

        const openRequisitions = await pool.query(
          "SELECT COUNT(*) FROM staff_requisitions "
        );
        const result = await pool.query(`
            SELECT 
      TO_CHAR(p.month, 'Mon') AS month,  -- Adjust the formatting as needed
      SUM(p.basic_salary) AS payroll,
      COUNT(l.id) AS leaves,
      COUNT(d.id) AS disciplinary,
      COUNT(r.id) AS requisitions
  FROM 
      (SELECT 
          date_trunc('month', month) AS month, 
          SUM(basic_salary) AS basic_salary
       FROM 
          payroll
       GROUP BY 
          date_trunc('month', month)) p
  LEFT JOIN 
      leave_requests l ON date_trunc('month', l.start_date) = p.month
  LEFT JOIN 
      disciplinary_cases d ON date_trunc('month', d.action_date) = p.month
  LEFT JOIN 
      staff_requisitions r ON date_trunc('month', r.requested_date) = p.month
  GROUP BY 
      p.month
  ORDER BY 
      p.month;
  
          `);

        res.json({
          totalEmployees: totalEmployees.rows[0].count,
          totalPayroll: totalPayroll.rows[0].sum,
          leaveRequests: leaveRequests.rows[0].count,
          openRequisitions: openRequisitions.rows[0].count,
          results: result.rows,
        });
      }
    }
  );
});

router.post("/employeedash", async (req, res) => {
  jwt.verify(
    req.body.token,
    process.env.SECRET_KEY,
    async function (err, foundUser) {
      if (err) {
        if (err.message === "jwt expired") {
          return res.json({ message: "token expired" });
        } else {
          return res.status(500).json({ message: "Invalid token" });
        }
      }

      if (foundUser) {
        try {
          // Step 1: Fetch employee_id from the users table
          const userResult = await pool.query(
            `SELECT employee_id FROM users WHERE id = $1`,
            [foundUser.user.id]
          );

          if (userResult.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
          }

          const employeeId = userResult.rows[0].employee_id;

          // Step 2: Use employee_id to fetch employee's payroll and leave balance details
          const result = await pool.query(
            `
              SELECT
                e.id AS employee_id,
                CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
                e.Employee_number,
                e.position,
                e.department,
                DATE(e.hire_date) AS hire_date,
                p.month,
                p.basic_salary,
                p.house_allowance,
                p.transport_allowance,
                p.other_allowances,
                p.overtime,
                p.gross_pay,
                p.nssf_tier_i,
                p.nssf_tier_ii,
                p.nhif,
                p.housing_levy,
                p.taxable_income,
                p.paye,
                p.personal_relief,
                p.insurance_relief,
                p.net_pay,
                p.other_deductions,
                lb.sick_leave_balance,
                lb.annual_leave_balance,
                lb.sick_leave_used,
                lb.maternity_leave_entitlement,
                lb.paternity_leave_entitlement,
                lb.compassionate_leave_entitlement
              FROM employees e
              LEFT JOIN payroll p ON e.id = p.employee_id
              LEFT JOIN leave_balances lb ON e.id = lb.employee_id
              WHERE e.id = $1
              ORDER BY p.month DESC;
            `,
            [employeeId]
          );

          console.log(result.rows);
          res.json({
            results: result.rows,
          });
        } catch (error) {
          console.error("Error fetching data:", error);
          res.status(500).json({
            message: "An error occurred while fetching the data",
            error: error.message,
          });
        }
      }
    }
  );
});

router.post("/payrollData", async (req, res) => {
  try {
    jwt.verify(
      req.body.token,
      process.env.SECRET_KEY,
      async function (err, foundUser) {
        if (err) {
          if (err.message === "jwt expired") {
            res.json({ message: "token expired" });
          }
        }
        if (foundUser) {
          const result = await pool.query(`
              SELECT 
                  e.id,
                  CONCAT(e.first_name, ' ', e.last_name) AS name,
                  e.position,
                  p.gross_salary AS salary,
            
                  p.deductions
              FROM 
                  payroll p
              JOIN 
                  employees e ON p.employee_id = e.id;
            `);
          const payrollData = result.rows.map((row) => ({
            id: row.id,
            name: row.name,
            position: row.position,
            salary: row.salary,
            bonus: row.bonus,
            deductions: row.deductions,
          }));

          console.log(payrollData);

          res.json({
            payrollData: payrollData,
          });
        }
      }
    );
  } catch (err) {
    console.log("Error", err);
  }
});

router.post("/profile", async (req, res) => {
  try {
    jwt.verify(
      req.body.token,
      process.env.SECRET_KEY,
      async function (err, foundUser) {
        if (err) {
          if (err.message === "jwt expired") {
            return res.json({ message: "token expired" });
          } else {
            return res.status(500).json({ message: "Invalid token" });
          }
        }

        if (foundUser) {
          // Step 1: Fetch employee_id from the users table
          const userResult = await pool.query(
            `SELECT employee_id FROM users WHERE id = $1`,
            [foundUser.user.id]
          );

          if (userResult.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
          }

          const employeeId = userResult.rows[0].employee_id;

          // Step 2: Use employee_id to fetch employee's profile data
          const result = await pool.query(
            `
              SELECT * FROM employees WHERE id = $1;
            `,
            [employeeId]
          );

          if (result.rows.length === 0) {
            return res.status(404).json({ message: "Employee not found" });
          }
          console.log(result.rows[0]);
          res.json({
            result: result.rows[0], // Return the first row of the result
            email: foundUser.user.email,
          });
        }
      }
    );
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
});

router.post("/updateprofile", async (req, res) => {
  console.log(req.body);
  try {
    jwt.verify(
      req.body.token,
      process.env.SECRET_KEY,
      async function (err, foundUser) {
        if (err) {
          if (err.message === "jwt expired") {
            return res.json({ message: "token expired" });
          } else {
            return res.status(500).json({ message: "Invalid token" });
          }
        }

        if (foundUser) {
          // Step 1: Fetch employee_id from the users table
          const userResult = await pool.query(
            `SELECT employee_id FROM users WHERE id = $1`,
            [foundUser.user.id]
          );

          if (userResult.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
          }

          const employeeId = userResult.rows[0].employee_id;
          console.log("iiiiid", employeeId);
          // Step 2: Update employee's profile data
          const result = await pool.query(
            `
              UPDATE employees
              SET
                first_name = SPLIT_PART($1, ' ', 1),
                last_name = SPLIT_PART($1, ' ', 2),
                phone_number = $2,
                location = $3
              WHERE id = $4;
            `,
            [req.body.name, req.body.phoneNumber, req.body.location, employeeId]
          );

          // Step 3: Fetch the updated employee data
          const updateUser = await pool.query(
            `SELECT * FROM employees WHERE id = $1;`,
            [employeeId]
          );

          console.log("uuuuuser", updateUser.rows[0]);

          res.json({ message: "Profile updated", user: updateUser.rows[0] });
        }
      }
    );
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ message: "An error occurred", error: err.message });
  }
});

router.post("/leaverequests", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM  leave_requests WHERE employee_id = $1`,
      [req.body.employeeId]
    );
    res.json({ requests: result.rows });
  } catch (err) {
    console.log("Error", err);
  }
});

router.post("/adjustleave", async (req, res) => {
  console.log(req.body);
  try {
    const result = await pool.query(
      `SELECT id FROM  employees WHERE Employee_number = $1`,
      [req.body.employeeNumber]
    );

    if (req.body.leaveType === "Annual") {
      const result2 = await pool.query(
        `UPDATE leave_balances SET annual_leave_adjustment =  $1 WHERE employee_id = $2`,
        [req.body.days, result.rows[0].id]
      );
    }
    if (req.body.leaveType === "Sick") {
      const result2 = await pool.query(
        `UPDATE leave_balances SET sick_leave_adjustment =  $1 WHERE employee_id = $2`,
        [req.body.days, result.rows[0].id]
      );
    }
    if (req.body.leaveType === "Paternity") {
      const result2 = await pool.query(
        `UPDATE leave_balances SET  paternity_leave_used =  $1 WHERE employee_id = $2`,
        [req.body.days, result.rows[0].id]
      );
    }
    if (req.body.leaveType === "Maternity") {
      const result2 = await pool.query(
        `UPDATE leave_balances SET  maternity_leave_used = $1 WHERE employee_id = $2`,
        [req.body.days, result.rows[0].id]
      );
    }
    if (req.body.leaveType === "Compassionate") {
      const result2 = await pool.query(
        `UPDATE leave_balances SET compassionate_leave_used = $1 WHERE employee_id = $2`,
        [req.body.days, result.rows[0].id]
      );
    }

    res.json({ message: "update successfull" });
  } catch (err) {
    console.log("Error", err);
  }
});

router.post("/discplinary", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM  disciplinary_cases WHERE employee_id = $1`,
      [req.body.employeeId]
    );
    const result2 = await pool.query(
      `SELECT * FROM warnings  WHERE employee_id = $1`,
      [req.body.employeeId]
    );

    console.log(result.rows);

    res.json({ cases: result.rows, warnings: result2.rows });
  } catch (err) {
    console.log("Error", err);
  }
});

router.post("/payroll", async (req, res) => {
  try {
    const result = await pool.query(`SELECT 
      payroll.*, -- Select all columns from the payroll table
      employees.first_name, 
      employees.last_name, 
      employees.position, 
      employees.department
  FROM 
      payroll
  JOIN 
      employees 
  ON 
      payroll.employee_id = employees.id;
  `);

    console.log(result.rows);

    res.json({ payroll: result.rows });
  } catch (err) {
    console.log("Error", err);
  }
});

router.post("/updatecase", async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE disciplinary_cases SET status = $1 WHERE id = $2`,
      [req.body.status, req.body.id]
    );

    res.json({ message: "updated succesfully" });
  } catch (err) {
    console.log("Error", err);
  }
});

router.post("/handlerequest", async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE staff_requisitions SET status = $1 WHERE id = $2`,
      [req.body.status, req.body.id]
    );

    res.json({ message: "updated succesfully" });
  } catch (err) {
    console.log("Error", err);
  }
});

router.post("/recordcase", async (req, res) => {
  try {
    console.log(req.body);

    const result = await pool.query(
      `SELECT id FROM employees  WHERE Employee_number = $1`,
      [req.body.employeeId]
    );

    console.log(result.rows[0].id);
    if (result.rows[0].id) {
      const result1 = await pool.query(
        `INSERT INTO disciplinary_cases (employee_id, action_type, description, action_date, status)
          VALUES 
               ($1,$2,$3,$4,$5);`,
        [
          result.rows[0].id,
          req.body.actionType,
          req.body.reason,
          req.body.date,
          req.body.status,
        ]
      );

      res.json({ message: "updated succesfully" });
    }
  } catch (err) {
    console.log("Error", err);
  }
});

router.post("/leaveData", async (req, res) => {
  try {
    jwt.verify(
      req.body.token,
      process.env.SECRET_KEY,
      async function (err, foundUser) {
        if (err) {
          if (err.message === "jwt expired") {
            res.json({ message: "token expired" });
          }
        }
        if (foundUser) {
          const result = await pool.query(`
              SELECT 
                      e.id,
                      CONCAT(e.first_name, ' ', e.last_name) AS name,
                      l.leave_type,
                      TO_CHAR(l.start_date, 'MM/DD/YYYY') AS start_date,
                      TO_CHAR(l.end_date, 'MM/DD/YYYY') AS end_date,
                      l.status
              FROM 
                   leave_requests l
              JOIN 
                   employees e ON l.employee_id = e.id;
  
  
            `);

          res.json({
            leaveData: result.rows,
          });
        }
      }
    );
  } catch (err) {
    console.log("Error", err);
  }
});

router.post("/requestLeave", async (req, res) => {
  console.log("Body", req.body);
  try {
    const query1 = `
        select id from  employees 
        WHERE  employee_number = $1;
      `;
    const query = `
      INSERT INTO leave_requests (
          employee_id,
          leave_type,
          start_date,
          end_date,
          total_days,
          status
        ) VALUES (
          $1, $2, $3, $4, $5, $6
        )
        RETURNING *;
      `;

    const result = await pool.query(query1, [req.body.employeeId]);

    if (result.rows[0].id) {
      const result2 = await pool.query(query, [
        result.rows[0].id,
        req.body.leaveType.toLowerCase(),
        req.body.startDate,
        req.body.endDate,
        req.body.days,
        "pending",
      ]);

      console.log(result2.rows);

      res.status(200).json({
        message: "Leave inserted successfully",
        updatedEntry: result2.rows[0],
      });
    }
  } catch (err) {
    console.error("Error updating leave:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Route to add a new user
router.post("/adduser", async (req, res) => {
  try {
    const { email, employeeId, name, role, password, company } = req.body;

    // Step 1: Get the employee's id from the employees table using the employeeId
    const employeeCheckQuery =
      "SELECT id FROM employees WHERE employee_number = $1"; // Assuming employee_number is a column in employees table
    const employeeResult = await pool.query(employeeCheckQuery, [employeeId]);

    // Check if the employee exists
    if (employeeResult.rows.length === 0) {
      return res.status(404).json({
        message: "Employee with the provided employeeId does not exist",
      });
    }

    const employeeDbId = employeeResult.rows[0].id; // The employee's ID in the database

    // Step 2: Check if a user with the same employee id and email already exists in the users table
    const userCheckQuery =
      "SELECT * FROM users WHERE email = $1 AND employee_id = $2";
    const userCheckResult = await pool.query(userCheckQuery, [
      email,
      employeeDbId,
    ]);

    if (userCheckResult.rows.length > 0) {
      return res.status(409).json({
        message: "A user with this email and employeeId already exists",
      });
    }

    // Step 3: Hash the password before inserting the user
    const hashedPassword = await bcrypt.hash(password, 10); // Hash the password with salt rounds of 10

    // Step 4: Insert the new user into the users table
    const insertUserQuery = `
      INSERT INTO users (email, employee_id, role, registration_pass, company)
      VALUES ($1, $2, $3, $4, $5) RETURNING *`;

    const newUser = await pool.query(insertUserQuery, [
      email,
      employeeDbId,
      role,
      hashedPassword,
      company,
    ]);

    // Step 5: Send an email with the password to the user's email
    const mailOptions = {
      from: "hrms.livecrib@gmail.com",
      to: email,
      subject: "Welcome to HRMS - Your Account Details",
      html: `
        <p>Dear ${name},</p>
        <p>Your account has been successfully created in the HRMS system.</p>
        <p>Your login details are as follows:</p>
        <p>Email: ${email}</p>
        <p>Password: ${password}</p>
        <p>Please login and change your password as soon as possible.</p>
        <p>If you have any questions, feel free to reach out.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({
      message: "User added successfully and email sent",
      user: newUser.rows[0], // Return the newly created user
    });
  } catch (error) {
    console.error("Error adding user:", error);
    res.status(500).json({
      message: "An error occurred while adding the user",
      error: error.message,
    });
  }
});

export default router;
