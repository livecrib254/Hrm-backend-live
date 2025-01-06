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


// Helper function to get the current month
//const getCurrentMonth = () => new Date().toISOString().slice(0, 7);
const getCurrentMonth = () => {
    const currentYear =2024 //new Date().getFullYear();
    return `${currentYear}-01`; // Sets the month to June
  };

router.get('/processbulkpayroll', async (req, res) => {
  const month = getCurrentMonth();
  console.log(month)
  try {
    // Check if payroll is already processed for this month
    const payrollExists = await pool.query(
      'SELECT * FROM payroll WHERE TO_CHAR(month, \'YYYY-MM\') = $1',
      [month]
    );

    if (payrollExists.rowCount > 0) {
      return res.status(400).json({ message: `Payroll for ${month} is already processed.` });
    }

    // Get all employees' payroll info
    const payrollInfo = await pool.query('SELECT * FROM payroll_info');

    // Process payroll and simulate bank disbursement
    const payrollPromises = payrollInfo.rows.map(async (info) => {
      const grossPay = info.basic_salary + info.house_allowance + info.transport_allowance +
                       info.other_allowances + info.overtime + info.bonus;

      // Simulate Bank API call for each employee
            // const bankSimulationResponse = await axios.post('http://localhost:5000/api/payroll/bank-simulation', {
            //     employeeId: info.employee_id,
            //     amount: grossPay,
            // });

      const bankSimulationResponse = "successfully"

      // Check if the bank disbursement was successful
      if (bankSimulationResponse.includes('successfully')) {
        // Insert payroll record if bank disbursement is successful
        await pool.query(
          `INSERT INTO payroll 
            (employee_id, month, basic_salary, house_allowance, transport_allowance, 
            other_allowances, other_deductions, overtime, bonus, personal_relief, 
            insurance_relief, helb_deduction, sacco_deduction)
          VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            info.employee_id, "2024-01-05", info.basic_salary, info.house_allowance,
            info.transport_allowance, info.other_allowances, info.other_deductions,
            info.overtime, info.bonus, info.personal_relief, info.insurance_relief,
            info.helb_deduction, info.sacco_deduction
          ]
        );
      } else {
        throw new Error(`Bank disbursement failed for employee ID ${info.employee_id}`);
      }
    });

    await Promise.all(payrollPromises);

    return res.status(201).json({ message: `Payroll for ${month} processed successfully.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Error processing payroll' });
  }
});

export default router