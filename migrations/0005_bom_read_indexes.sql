-- Read-path indexes verified by the BOM query shapes. Apply to staging first and
-- confirm with EXPLAIN QUERY PLAN before promoting to production.
CREATE INDEX IF NOT EXISTS idx_equipment_machine_status_created
ON equipment_records(machine_id, record_status, created_at);

CREATE INDEX IF NOT EXISTS idx_operations_machine_status_created
ON equipment_operations(machine_id, status, created_at DESC);
