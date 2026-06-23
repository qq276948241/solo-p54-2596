const express = require('express');
const { getDb } = require('../db/connection');
const { EQUIPMENT_STATUS } = require('../db/init');

const router = express.Router();

const VALID_STATUSES = Object.values(EQUIPMENT_STATUS);

router.get('/', (req, res) => {
  const db = getDb();
  const { status, keyword } = req.query;
  let sql = 'SELECT * FROM equipments WHERE 1=1';
  const params = [];

  if (status && VALID_STATUSES.includes(status)) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (keyword) {
    sql += ' AND (name LIKE ? OR model LIKE ? OR serial_number LIKE ?)';
    const like = `%${keyword}%`;
    params.push(like, like, like);
  }
  sql += ' ORDER BY id DESC';

  const rows = db.prepare(sql).all(...params);
  res.json({ code: 0, data: rows });
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM equipments WHERE id = ?').get(req.params.id);
  if (!row) {
    return res.status(404).json({ code: 1, message: '设备不存在' });
  }
  res.json({ code: 0, data: row });
});

router.post('/', (req, res) => {
  const db = getDb();
  const { name, model, serial_number, purchase_date, status } = req.body;

  if (!name || !serial_number) {
    return res.status(400).json({ code: 1, message: '设备名称和序列号为必填项' });
  }

  const finalStatus = status || EQUIPMENT_STATUS.IDLE;
  if (!VALID_STATUSES.includes(finalStatus)) {
    return res.status(400).json({ code: 1, message: `状态无效，可选值：${VALID_STATUSES.join(', ')}` });
  }

  try {
    const result = db.prepare(
      `INSERT INTO equipments (name, model, serial_number, purchase_date, status)
       VALUES (?, ?, ?, ?, ?)`
    ).run(name, model || '', serial_number, purchase_date || '', finalStatus);

    const equipment = db.prepare('SELECT * FROM equipments WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ code: 0, data: equipment });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ code: 1, message: '序列号已存在' });
    }
    throw err;
  }
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, model, serial_number, purchase_date, status } = req.body;

  const existing = db.prepare('SELECT * FROM equipments WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ code: 1, message: '设备不存在' });
  }

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ code: 1, message: `状态无效，可选值：${VALID_STATUSES.join(', ')}` });
  }

  try {
    db.prepare(
      `UPDATE equipments SET
        name = ?, model = ?, serial_number = ?, purchase_date = ?, status = ?,
        updated_at = datetime('now', 'localtime')
       WHERE id = ?`
    ).run(
      name ?? existing.name,
      model ?? existing.model,
      serial_number ?? existing.serial_number,
      purchase_date ?? existing.purchase_date,
      status ?? existing.status,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM equipments WHERE id = ?').get(req.params.id);
    res.json({ code: 0, data: updated });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ code: 1, message: '序列号已存在' });
    }
    throw err;
  }
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM equipments WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ code: 1, message: '设备不存在' });
  }

  const borrowCount = db.prepare(
    "SELECT COUNT(*) AS cnt FROM borrow_records WHERE equipment_id = ? AND status = 'borrowed'"
  ).get(req.params.id);

  if (borrowCount.cnt > 0) {
    return res.status(400).json({ code: 1, message: '该设备有未归还的借出记录，无法删除' });
  }

  db.prepare('DELETE FROM equipments WHERE id = ?').run(req.params.id);
  res.json({ code: 0, message: '删除成功' });
});

module.exports = router;
