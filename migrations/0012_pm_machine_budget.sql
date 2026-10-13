-- Add budget_amount column to pm_machine_orders
ALTER TABLE pm_machine_orders ADD COLUMN budget_amount REAL NOT NULL DEFAULT 0;
