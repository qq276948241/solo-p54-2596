const express = require('express');
const { getDb } = require('../db/connection');

const router = express.Router();

router.get('/department-borrow-count', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT emp.department,
           COUNT(*) AS borrow_count
    FROM borrow_records br
    JOIN employees emp ON br.employee_id = emp.id
    GROUP BY emp.department
    ORDER BY borrow_count DESC
  `).all();

  res.json({ code: 0, data: rows });
});

router.get('/overdue', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT br.*, e.name AS equipment_name, e.serial_number, e.model,
           emp.name AS employee_name, emp.department, emp.employee_number
    FROM borrow_records br
    JOIN equipments e ON br.equipment_id = e.id
    JOIN employees emp ON br.employee_id = emp.id
    WHERE br.status = 'borrowed'
      AND br.expected_return_date IS NOT NULL
      AND date(br.expected_return_date) < date('now', 'localtime')
    ORDER BY br.expected_return_date ASC
  `).all();

  res.json({ code: 0, data: rows });
});

router.get('/equipment-status-summary', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT status, COUNT(*) AS count
    FROM equipments
    GROUP BY status
  `).all();

  res.json({ code: 0, data: rows });
});

module.exports = router;
