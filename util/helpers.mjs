import { pool } from "../db/db.mjs";

// Async function to get the next employee number
export async function getNextEmployeeNumber() {
  try {
    // Query to get the highest employee_number
    const result = await pool.query(
      `SELECT employee_number 
         FROM employees 
         ORDER BY CAST(SUBSTRING(employee_number, 4) AS INTEGER) DESC 
         LIMIT 1`
    );

    // Extract the highest employee_number
    let highestEmployeeNumber = result.rows[0]?.employee_number || "EMP000";

    // Extract the numeric part and increment it by one
    let numericPart = parseInt(highestEmployeeNumber.slice(3), 10) + 1;

    // Create the new employee number in the EMPXXX format
    let nextEmployeeNumber = `EMP${String(numericPart).padStart(3, "0")}`;

    return nextEmployeeNumber;
  } catch (err) {
    console.error("Error getting next employee number:", err);
    throw err;
  }
}
