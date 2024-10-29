 
                                                      -- Employees Table

CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    employee_number VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    gender VARCHAR(50) CHECK (gender IN ('male', 'female')),
    date_of_birth DATE,
    national_id_number VARCHAR(255),
    phone_number VARCHAR(20),
    location VARCHAR(255),
    department VARCHAR(255),
    position VARCHAR(255),
    hire_date DATE,
    company VARCHAR (255) NOT NULL,
    bank_name VARCHAR (255) NOT NULL,
    bank_account_no VARCHAR(20) NOT NULL,
    kra_pin VARCHAR (255) NOT NULL,
    nhif_no VARCHAR (255) NOT NULL,
    nssf_no VARCHAR (255) NOT NULL,
    status VARCHAR(50) CHECK (status IN ('active', 'inactive', 'terminated')) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);




                                                      -- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    resetPasswordToken VARCHAR(255),
    reset_password_expires TIMESTAMP,
    password_hash TEXT,
    registration_pass TEXT,
    company VARCHAR (255) NOT NULL,
    role VARCHAR(50) CHECK (role IN ('super_admin', 'admin', 'employee', 'disabled')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

                                                         --Payroll info

CREATE TABLE payroll_info (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    basic_salary DECIMAL(15, 2) NOT NULL,
    house_allowance DECIMAL(15, 2) DEFAULT 0.00,
    transport_allowance DECIMAL(15, 2) DEFAULT 0.00,
    other_allowances DECIMAL(15, 2) DEFAULT 0.00,
    other_deductions DECIMAL(15, 2) DEFAULT 0.00,
    overtime DECIMAL(15, 2) DEFAULT 0.00,
    bonus DECIMAL(15, 2) DEFAULT 0.00,
    personal_relief DECIMAL(15, 2) DEFAULT 0.00,
    insurance_relief DECIMAL(15, 2) DEFAULT 0.00,
    helb_deduction DECIMAL(15, 2) DEFAULT 0.00,
    sacco_deduction DECIMAL(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP

);


                                                         -- Payroll Table

CREATE TABLE payroll (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    month DATE NOT NULL,
    basic_salary DECIMAL(15, 2) NOT NULL,
    house_allowance DECIMAL(15, 2) DEFAULT 0.00,
    transport_allowance DECIMAL(15, 2) DEFAULT 0.00,
    other_allowances DECIMAL(15, 2) DEFAULT 0.00,
    other_deductions DECIMAL(15, 2) DEFAULT 0.00,
    overtime DECIMAL(15, 2) DEFAULT 0.00,
    bonus DECIMAL(15, 2) DEFAULT 0.00,
    gross_pay DECIMAL(15, 2) GENERATED ALWAYS AS (
        basic_salary + house_allowance + transport_allowance + other_allowances + overtime + bonus
    ) STORED,
    nssf_tier_i DECIMAL(15, 2) DEFAULT 0.00,
    nssf_tier_ii DECIMAL(15, 2) DEFAULT 0.00,
    nhif DECIMAL(15, 2) DEFAULT 0.00,
    housing_levy DECIMAL(15, 2) DEFAULT 0.00,
    taxable_income DECIMAL(15, 2) GENERATED ALWAYS AS (
        basic_salary + house_allowance + transport_allowance + other_allowances + overtime + bonus
        - nssf_tier_i - nssf_tier_ii
    ) STORED,
    paye DECIMAL(15, 2) DEFAULT 0.00,
    personal_relief DECIMAL(15, 2) DEFAULT 0.00,
    insurance_relief DECIMAL(15, 2) DEFAULT 0.00,
    helb_deduction DECIMAL(15, 2) DEFAULT 0.00,
    sacco_deduction DECIMAL(15, 2) DEFAULT 0.00,
    net_pay DECIMAL(15, 2) GENERATED ALWAYS AS (
        basic_salary + house_allowance + transport_allowance + other_allowances + overtime + bonus
        - nssf_tier_i - nssf_tier_ii - nhif - housing_levy - paye - other_deductions + personal_relief + insurance_relief
    ) STORED,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP

);

                                                         -- Leave Balances Table

CREATE TABLE leave_balances (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    annual_leave_entitlement NUMERIC(10, 2) DEFAULT 21,
    annual_leave_used NUMERIC(10, 2) DEFAULT 0,
    annual_leave_adjustment NUMERIC(10, 2) DEFAULT 0,
    annual_leave_balance NUMERIC(10, 2) GENERATED ALWAYS AS 
        (annual_leave_entitlement - annual_leave_used + annual_leave_adjustment) STORED,
    sick_leave_entitlement NUMERIC(10, 2) DEFAULT 30,
    sick_leave_used NUMERIC(10, 2) DEFAULT 0,
    sick_leave_adjustment NUMERIC(10, 2) DEFAULT 0,
    sick_leave_balance NUMERIC(10, 2) GENERATED ALWAYS AS 
        (sick_leave_entitlement - sick_leave_used + sick_leave_adjustment) STORED,
    maternity_leave_entitlement NUMERIC(10, 2) DEFAULT 90,
    maternity_leave_used NUMERIC(10, 2) DEFAULT 0,
    paternity_leave_entitlement NUMERIC(10, 2) DEFAULT 14,
    paternity_leave_used NUMERIC(10, 2) DEFAULT 0,
    compassionate_leave_entitlement NUMERIC(10, 2) DEFAULT 5,
    compassionate_leave_used NUMERIC(10, 2) DEFAULT 0,
    study_leave_entitlement NUMERIC(10, 2) DEFAULT 0,
    study_leave_used NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


                                                         -- Leave Requests Table

CREATE TABLE leave_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) CHECK (leave_type IN ('annual', 'sick', 'maternity', 'paternity', 'compassionate')) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DECIMAL(15, 2) DEFAULT 0.00,
    status VARCHAR(50) CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

                                                     -- Disciplinary Cases Table

CREATE TABLE disciplinary_cases (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    action_type VARCHAR(255) NOT NULL,
    description TEXT,
    action_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'under review')),
    resolved BOOLEAN DEFAULT FALSE,
    resolver_id INTEGER REFERENCES employees(id),
    resolution_date DATE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

                                                      -- Staff Requisitions Table

CREATE TABLE staff_requisitions (
    id SERIAL PRIMARY KEY,
    department VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL,
    justification TEXT,
    status VARCHAR(50) CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    requested_date DATE NOT NULL,
    approval_date DATE,
    approver_id INTEGER REFERENCES employees(id),
    requester_id INTEGER REFERENCES employees(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

                                                       -- Attendance Table

CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'half-day', 'on leave')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

                                                        -- Recognition History  Table

CREATE TABLE recognition_history (
    id SERIAL PRIMARY KEY,
    recipient_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,  -- Foreign key to the employees table
    recognition_type VARCHAR(100) NOT NULL,  -- Type of recognition (e.g., Kudos)
    category VARCHAR(100),  -- Category (e.g., Innovation)
    message TEXT,  -- Recognition message
    impact VARCHAR(100),  -- Impact scope (e.g., Team, Company-wide)
    recognition_date DATE NOT NULL,  -- Date of recognition
    likes INTEGER DEFAULT 0,  -- Number of likes
    tags TEXT[]  -- Array of tags (e.g., technical, innovation)
);


                                                      -- Holidays Table

CREATE TABLE holiday_definitions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    day INTEGER NOT NULL CHECK (day BETWEEN 1 AND 31),
    description TEXT,
    is_recurring BOOLEAN DEFAULT TRUE,
    is_movable BOOLEAN DEFAULT FALSE, -- For holidays like Good Friday
    recurrence_pattern VARCHAR(50) DEFAULT 'yearly', -- Future-proofing for more patterns
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE holidays (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    description TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

                                                    -- Warning Types Table

CREATE TABLE warning_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    expiry_days INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

                                                      -- Warnings Table

CREATE TABLE warnings (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    type_id INTEGER REFERENCES warning_types(id) ON DELETE SET NULL,
    description TEXT,
    issue_date DATE NOT NULL,
    expiry_date DATE,
    attachments TEXT[],
    issuer_id INTEGER REFERENCES employees(id),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Add triggers to update the 'updated_at' column
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_disciplinary_cases_modtime
    BEFORE UPDATE ON disciplinary_cases
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_staff_requisitions_modtime
    BEFORE UPDATE ON staff_requisitions
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_attendance_modtime
    BEFORE UPDATE ON attendance
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_holidays_modtime
    BEFORE UPDATE ON holidays
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_warning_types_modtime
    BEFORE UPDATE ON warning_types
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_warnings_modtime
    BEFORE UPDATE ON warnings
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

                                                         -- Functions and Triggers

                                                     -- Function to set gender-based leave

CREATE OR REPLACE FUNCTION set_gender_based_leave() RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT gender FROM employees WHERE id = NEW.employee_id) = 'female' THEN
        NEW.maternity_leave_entitlement := 90;
        NEW.paternity_leave_entitlement := 0;
    ELSE
        NEW.maternity_leave_entitlement := 0;
        NEW.paternity_leave_entitlement := 14;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gender_based_leave_trigger
BEFORE INSERT ON leave_balances
FOR EACH ROW
EXECUTE FUNCTION set_gender_based_leave();

                                                  -- Payroll Function 

CREATE OR REPLACE FUNCTION calculate_payroll() RETURNS TRIGGER AS $$
DECLARE
    taxable_income DECIMAL(15, 2);
    tax DECIMAL(15, 2);
    nssf_deduction DECIMAL(15, 2);
    pensionable_pay DECIMAL(15, 2);
BEGIN
    -- Calculate gross pay
    NEW.gross_pay := NEW.basic_salary + NEW.house_allowance + NEW.transport_allowance + 
                     NEW.other_allowances + NEW.overtime + NEW.bonus;

    -- Calculate NSSF
       
    NEW.nssf_tier_i := LEAST(NEW.basic_salary * 0.06, 360);
    NEW.nssf_tier_ii := LEAST(GREATEST(NEW.basic_salary - 6000, 0) * 0.06, 720);
    -- Assuming pensionable pay is the basic salary
    pensionable_pay := NEW.basic_salary;
    
    IF pensionable_pay <= 6000 THEN
        -- Tier I: 6% of pensionable pay up to 6,000
        nssf_deduction := pensionable_pay * 0.06;
    ELSIF pensionable_pay <= 18000 THEN
        -- Tier II: 6% of pensionable pay between 6,001 and 18,000
        nssf_deduction := 360 + (pensionable_pay - 6000) * 0.06;
    ELSE
        -- Maximum contribution
        nssf_deduction := 1080;
    END IF;

    -- Assign the calculated NSSF to NEW.nssf_tier_i and set NEW.nssf_tier_ii to 0
    NEW.nssf_tier_i := nssf_deduction;
    NEW.nssf_tier_ii := 0;

    -- Calculate NHIF
    NEW.nhif := CASE
        WHEN NEW.gross_pay <= 5999 THEN 150
        WHEN NEW.gross_pay <= 7999 THEN 300
        WHEN NEW.gross_pay <= 11999 THEN 400
        WHEN NEW.gross_pay <= 14999 THEN 500
        WHEN NEW.gross_pay <= 19999 THEN 600
        WHEN NEW.gross_pay <= 24999 THEN 750
        WHEN NEW.gross_pay <= 29999 THEN 850
        WHEN NEW.gross_pay <= 34999 THEN 900
        WHEN NEW.gross_pay <= 39999 THEN 950
        WHEN NEW.gross_pay <= 44999 THEN 1000
        WHEN NEW.gross_pay <= 49999 THEN 1100
        WHEN NEW.gross_pay <= 59999 THEN 1200
        WHEN NEW.gross_pay <= 69999 THEN 1300
        WHEN NEW.gross_pay <= 79999 THEN 1400
        WHEN NEW.gross_pay <= 89999 THEN 1500
        WHEN NEW.gross_pay <= 99999 THEN 1600
        ELSE 1700
    END;

    -- Calculate Housing Levy
    NEW.housing_levy := NEW.gross_pay * 0.015;

    -- Calculate taxable income
    taxable_income := NEW.gross_pay - nssf_deduction;
    NEW.taxable_income := taxable_income;

    -- Calculate PAYE
    IF taxable_income <= 24000 THEN
        tax := 0;
    ELSIF taxable_income <= 32333 THEN
        tax := (taxable_income - 24000) * 0.25;
    ELSIF taxable_income <= 500000 THEN
        tax := 2083.25 + (taxable_income - 32333) * 0.30;
    ELSIF taxable_income <= 800000 THEN
        tax := 142083.25 + (taxable_income - 500000) * 0.325;
    ELSE
        tax := 239583.25 + (taxable_income - 800000) * 0.35;
    END IF;
    
    NEW.paye := GREATEST(tax - NEW.personal_relief - NEW.insurance_relief, 0);

    -- Calculate net pay (now including HELB and SACCO deductions)
    NEW.net_pay := NEW.gross_pay - nssf_deduction - NEW.nhif - 
                   NEW.housing_levy - NEW.paye + NEW.personal_relief + NEW.insurance_relief -
                   NEW.helb_deduction - NEW.sacco_deduction - NEW.other_deductions;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

                                   -- Recreate the trigger

DROP TRIGGER IF EXISTS calculate_payroll_trigger ON payroll;
CREATE TRIGGER calculate_payroll_trigger
BEFORE INSERT OR UPDATE ON payroll
FOR EACH ROW
EXECUTE FUNCTION calculate_payroll();


                                   --Functions for Leave

CREATE OR REPLACE FUNCTION calculate_leave_balance() RETURNS TRIGGER AS $$
DECLARE
    emp_hire_date DATE;
    months_worked INTEGER;
    accrued_leaves NUMERIC(5,2);
    carried_forward NUMERIC(5,2);
    current_year INTEGER;
BEGIN
    -- Fetch the hire_date for the given employee_id
    SELECT hire_date INTO emp_hire_date FROM employees WHERE id = NEW.employee_id;
    
    -- If hire_date is not found, raise an error
    IF emp_hire_date IS NULL THEN
        RAISE EXCEPTION 'Employee with ID % does not exist.', NEW.employee_id;
    END IF;

    current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Calculate months worked in the current year
    IF EXTRACT(YEAR FROM emp_hire_date) = current_year THEN
        months_worked := EXTRACT(MONTH FROM CURRENT_DATE) - EXTRACT(MONTH FROM emp_hire_date) + 1;
    ELSE
        months_worked := EXTRACT(MONTH FROM CURRENT_DATE);
    END IF;

    -- Calculate accrued leaves (1.75 per month)
    accrued_leaves := GREATEST(months_worked * 1.75, 0);

    -- Calculate carried forward leaves (max 5 days)
    IF EXTRACT(YEAR FROM emp_hire_date) < current_year THEN
        carried_forward := LEAST(COALESCE(NEW.annual_leave_balance, 0), 5);
    ELSE
        carried_forward := 0;
    END IF;

    -- Update the new leave balance
    NEW.annual_leave_balance := accrued_leaves + carried_forward + NEW.annual_leave_adjustment - NEW.annual_leave_used;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_annual_leave_trigger
BEFORE INSERT OR UPDATE ON leave_balances
FOR EACH ROW
EXECUTE FUNCTION calculate_leave_balance();


CREATE OR REPLACE FUNCTION add_leave_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert a leave balance entry with default values for the new employee
    INSERT INTO leave_balances (
        employee_id,
        year,
        annual_leave_used,
        sick_leave_used,
        annual_leave_adjustment,
        sick_leave_adjustment,
        maternity_leave_used,
        paternity_leave_used,
        compassionate_leave_used
    )
    VALUES (
        NEW.id,                -- Employee ID
        EXTRACT(YEAR FROM CURRENT_DATE),  -- Current year
        0,                     -- Default annual leave used
        0,                     -- Default sick leave used
        0,                     -- No annual leave adjustment
        0,                     -- No sick leave adjustment
        CASE WHEN NEW.gender = 'female' THEN 0 ELSE 0 END,  -- Maternity leave used
        CASE WHEN NEW.gender = 'male' THEN 0 ELSE 0 END,    -- Paternity leave used
        0                      -- Compassionate leave used is 0 by default
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_add_leave_balance
AFTER INSERT ON employees
FOR EACH ROW
EXECUTE FUNCTION add_leave_balance();

CREATE OR REPLACE FUNCTION update_leave_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' THEN
        CASE NEW.leave_type
            WHEN 'annual' THEN
                UPDATE leave_balances
                SET annual_leave_used = annual_leave_used + NEW.total_days,
                    updated_at = CURRENT_TIMESTAMP
                WHERE employee_id = NEW.employee_id AND year = EXTRACT(YEAR FROM CURRENT_DATE);

            WHEN 'sick' THEN
                UPDATE leave_balances
                SET sick_leave_used = sick_leave_used + NEW.total_days,
                    updated_at = CURRENT_TIMESTAMP
                WHERE employee_id = NEW.employee_id AND year = EXTRACT(YEAR FROM CURRENT_DATE);

            WHEN 'maternity' THEN
                -- Update maternity leave used
                UPDATE leave_balances
                SET maternity_leave_used = maternity_leave_used + NEW.total_days,
                    updated_at = CURRENT_TIMESTAMP
                WHERE employee_id = NEW.employee_id AND year = EXTRACT(YEAR FROM CURRENT_DATE);

            WHEN 'paternity' THEN
                -- Update paternity leave used
                UPDATE leave_balances
                SET paternity_leave_used = paternity_leave_used + NEW.total_days,
                    updated_at = CURRENT_TIMESTAMP
                WHERE employee_id = NEW.employee_id AND year = EXTRACT(YEAR FROM CURRENT_DATE);

            WHEN 'compassionate' THEN
                -- Update compassionate leave used
                UPDATE leave_balances
                SET compassionate_leave_used = compassionate_leave_used + NEW.total_days,
                    updated_at = CURRENT_TIMESTAMP
                WHERE employee_id = NEW.employee_id AND year = EXTRACT(YEAR FROM CURRENT_DATE);

            ELSE
                RAISE EXCEPTION 'Unknown leave type: %', NEW.leave_type;
        END CASE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_leave_request_update
AFTER UPDATE ON leave_requests
FOR EACH ROW
WHEN (NEW.status = 'approved')
EXECUTE FUNCTION update_leave_balance();

