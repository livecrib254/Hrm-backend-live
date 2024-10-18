import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import { pool } from "../db/db.mjs";
import bcrypt from "bcrypt";

const router = express.Router();
const saltRounds = 10;

router.put("/adduser", async (req, res) => {
  console.log(req.body);
  try {
    const query1 = `INSERT INTO employees 
    (employee_number, first_name, last_name, gender, date_of_birth, national_id_number, phone_number, location, department, position, hire_date, company, bank_name, bank_account_no, kra_pin, nhif_no, nssf_no) 
    VALUES
    ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    RETURNING id`;
    const values1 = [
      req.body.employeeNumber,
      req.body.firstName,
      req.body.lastName,
      req.body.gender,
      req.body.dob,
      req.body.idNumber,
      req.body.phoneNumber,
      req.body.location,
      req.body.department,
      req.body.position,
      req.body.hireDate,
      "Techcorp", // hard code the company
      req.body.bankName,
      req.body.bankAccount,
      req.body.kraPin,
      req.body.nhifNo,
      req.body.nssfNo,
    ];
    const query2 = `
INSERT INTO payroll_info (
    employee_id, basic_salary, house_allowance, transport_allowance, 
    other_allowances, overtime, bonus, personal_relief, insurance_relief,
    helb_deduction, sacco_deduction
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`;

    const result1 = await pool.query(query1, values1);

    if (!result1.rows) {
      return res.json({ message: "user add failed" });
    }

    const values2 = [
      result1?.rows[0].id, //id from querry 3
      req.body.basicSalary,
      req.body.houseAllowance,
      req.body.transportAllowance,
      req.body.otherAllowances,
      req.body.overtime,
      req.body.bonus,
      req.body.personalRelief,
      req.body.insuranceRelief,
      req.body.helbDeduction,
      req.body.saccoDeduction,
    ];

    const result2 = await pool.query(query2, values2);

    if (result2.rows) {
      return res.json({ message: "user added Successfully" });
    }
    res.json({ message: "user add failed" });
  } catch (error) {
    console.log(error);
  }
});

router.put("/updateuser", async (req, res) => {
  try {
    let query = "";
    let values = [];
    let updated = "";

    if (req.body.password) {
      const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
      query = `UPDATE users SET  password_hash = $1 WHERE id = $2`;
      values = [hashedPassword, req.body.userId];
      updated = "password";
    }
    if (req.body.email) {
      query = `UPDATE users SET email = $1, role =$2 WHERE id = $3`;
      values = [req.body.email, req.body.role, req.body.userId];
      updated = "user";
    }

    const result = await pool.query(query, values);

    if (updated === "user") {
      console.log(updated);
      return res.json({
        message: "user update succesful",
      });
    }
    if (updated === "password") {
      console.log(updated);
      return res.json({
        message: "password update succesful",
      });
    }

    res.json({
      message: "user update failed",
    });
  } catch (error) {
    console.log(error);
  }
});

router.put("/approve/:id", async (req, res) => {
  const leaveId = req.params.id;
  console.log(leaveId, req.body.status);

  try {
    // Check if the leave request exists
    const leaveCheck = await pool.query(
      "SELECT * FROM leave_requests WHERE id = $1",
      [leaveId]
    );

    if (leaveCheck.rows.length === 0) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    // Update the status to 'approved'
    const updateQuery = `
      UPDATE leave_requests
      SET status = $1 
      WHERE id = $2
      RETURNING *
    `;

    const updatedLeave = await pool.query(updateQuery, [
      req.body.status,
      leaveId,
    ]);

    res.status(200).json({
      message: "Leave approved successfully",
      leave: updatedLeave.rows[0],
    });
  } catch (error) {
    console.error("Error approving leave:", error.message);
    res.status(500).json({ message: "Server error while approving leave" });
  }
});

export default router;
