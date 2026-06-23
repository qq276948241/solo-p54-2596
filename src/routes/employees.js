const express = require('express');
const { getDb } = require('../db/connection');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const { department, keyword } = req.query;
  let sql = 'SELECT * FROM employees WHERE 1=1';
  const params = [];

  if (department) {
    sql += ' AND department = ?';
    params.push(department);
  }
  if (keyword) {
    sql += ' AND (name LIKE ? OR employee_number LIKE ?)';
    const like = `%${keyword}%`;
    params.push(like, like);
  }
  sql += ' ORDER BY id DESC';

  const rows = db.prepare(sql).all(...params);
  res.json({ code: 0, data: rows });
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
  if (!row) {
    return res.status(404).json({ code: 1, message: '员工不存在' });
  }
  res.json({ code: 0, data: row });
});

router.post('/', (req, res) => {
  const db = getDb();
  const { name, department, employee_number } = req.body;

  if (!name || !employee_number) {
    return res.status(400).json({ code: 1, message: '姓名和工号为必填项' });
  }

  try {
    const result = db.prepare(
      `INSERT INTO employees (name, department, employee_number)
       VALUES (?, ?, ?)`
    ).run(name, department || '', employee_number);

    const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ code: 0, data: employee });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ code: 1, message: '工号已存在' });
    }
    throw err;
  }
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, department, employee_number } = req.body;

  const existing = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ code: 1, message: '员工不存在' });
  }

  try {
    db.prepare(
      `UPDATE employees SET
        name = ?, department = ?, employee_number = ?,
        updated_at = datetime('now', 'localtime')
       WHERE id = ?`
    ).run(
      name ?? existing.name,
      department ?? existing.department,
      employee_number ?? existing.employee_number,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
    res.json({ code: 0, data: updated });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ code: 1, message: '工号已存在' });
    }
    throw err;
  }
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ code: 1, message: '员工不存在' });
  }

  const borrowCount = db.prepare(
    "SELECT COUNT(*) AS cnt FROM borrow_records WHERE employee_id = ? AND status = 'borrowed'"
  ).get(req.params.id);

  if (borrowCount.cnt > 0) {
    return res.status(400).json({ code: 1, message: '该员工有未归还的借出记录，无法删除' });
  }

  db.prepare('DELETE FROM employees WHERE id = ?').run(req.params.id);
  res.json({ code: 0, message: '删除成功' });
});

module.exports = router;
