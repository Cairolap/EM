ALTER TABLE machines ADD COLUMN line_order INTEGER CHECK(line_order IS NULL OR line_order > 0);
CREATE INDEX machines_line_order ON machines(department_id, line_id, line_order, code);
