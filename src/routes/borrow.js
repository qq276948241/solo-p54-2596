const express = require('express');
const { getDb } = require('../db/connection');
const { EQUIPMENT_STATUS } = require('../db/init');

const router = express.Router();

router.post('/', (req, res) => {
  const db = getDb();
  const { equipment_id, employee_id, expected_return_date, remark } = req.body;

  if (!equipment_id || !employee_id) {
    return res.status(400).json({ code: 1, message: '设备ID和员工ID为必填项' });
  }

  const equipment = db.prepare('SELECT * FROM equipments WHERE id = ?').get(equipment_id);
  if (!equipment) {
    return res.status(404).json({ code: 1, message: '设备不存在' });
  }
  if (equipment.status !== EQUIPMENT_STATUS.IDLE) {
    return res.status(400).json({
      code: 1,
      message: `设备当前状态为"${equipment.status}"，仅"${EQUIPMENT_STATUS.IDLE}"状态可借出`,
    });
  }

  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(employee_id);
  if (!employee) {
    return res.status(404).json({ code: 1, message: '员工不存在' });
  }

  const borrowRecord = db.transaction(() => {
    db.prepare(
      `UPDATE equipments SET status = '${EQUIPMENT_STATUS.BORROWED}', updated_at = datetime('now', 'localtime') WHERE id = ?`
    ).run(equipment_id);

    const result = db.prepare(
      `INSERT INTO borrow_records (equipment_id, employee_id, expected_return_date, remark, status)
       VALUES (?, ?, ?, ?, 'borrowed')`
    ).run(equipment_id, employee_id, expected_return_date || null, remark || '');

    return db.prepare('SELECT * FROM borrow_records WHERE id = ?').get(result.lastInsertRowid);
  })();

  res.status(201).json({ code: 0, data: borrowRecord });
});

router.put('/:id/return', (req, res) => {
  const db = getDb();
  const record = db.prepare('SELECT * FROM borrow_records WHERE id = ?').get(req.params.id);

  if (!record) {
    return res.status(404).json({ code: 1, message: '借还记录不存在' });
  }
  if (record.status === 'returned') {
    return res.status(400).json({ code: 1, message: '该记录已归还，请勿重复操作' });
  }

  const returnedRecord = db.transaction(() => {
    db.prepare(
      `UPDATE equipments SET status = '${EQUIPMENT_STATUS.IDLE}', updated_at = datetime('now', 'localtime') WHERE id = ?`
    ).run(record.equipment_id);

    db.prepare(
      `UPDATE borrow_records SET status = 'returned', actual_return_date = datetime('now', 'localtime'), updated_at = datetime('now', 'localtime') WHERE id = ?`
    ).run(req.params.id);

    return db.prepare('SELECT * FROM borrow_records WHERE id = ?').get(req.params.id);
  })();

  res.json({ code: 0, data: returnedRecord });
});

router.get('/', (req, res) => {
  const db = getDb();
  const { status, employee_id, equipment_id } = req.query;
  let sql = `SELECT br.*, e.name AS equipment_name, e.serial_number, e.model,
             emp.name AS employee_name, emp.department, emp.employee_number
             FROM borrow_records br
             JOIN equipments e ON br.equipment_id = e.id
             JOIN employees emp ON br.employee_id = emp.id
             WHERE 1=1`;
  const params = [];

  if (status) {
    sql += ' AND br.status = ?';
    params.push(status);
  }
  if (employee_id) {
    sql += ' AND br.employee_id = ?';
    params.push(employee_id);
  }
  if (equipment_id) {
    sql += ' AND br.equipment_id = ?';
    params.push(equipment_id);
  }
  sql += ' ORDER BY br.id DESC';

  const rows = db.prepare(sql).all(...params);
  res.json({ code: 0, data: rows });
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare(
    `SELECT br.*, e.name AS equipment_name, e.serial_number, e.model,
            emp.name AS employee_name, emp.department, emp.employee_number
     FROM borrow_records br
     JOIN equipments e ON br.equipment_id = e.id
     JOIN employees emp ON br.employee_id = emp.id
     WHERE br.id = ?`
  ).get(req.params.id);

  if (!row) {
    return res.status(404).json({ code: 1, message: '借还记录不存在' });
  }
  res.json({ code: 0, data: row });
});

module.exports = router;
