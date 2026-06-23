const { getDb } = require('./connection');

const EQUIPMENT_STATUS = {
  IDLE: 'idle',
  BORROWED: 'borrowed',
  REPAIR: 'repair',
  RETIRED: 'retired',
};

function initTables() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS equipments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      model TEXT NOT NULL DEFAULT '',
      serial_number TEXT NOT NULL UNIQUE,
      purchase_date TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT '${EQUIPMENT_STATUS.IDLE}'
        CHECK(status IN ('${EQUIPMENT_STATUS.IDLE}', '${EQUIPMENT_STATUS.BORROWED}', '${EQUIPMENT_STATUS.REPAIR}', '${EQUIPMENT_STATUS.RETIRED}')),
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      department TEXT NOT NULL DEFAULT '',
      employee_number TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS borrow_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      borrow_date TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      expected_return_date TEXT,
      actual_return_date TEXT,
      status TEXT NOT NULL DEFAULT 'borrowed'
        CHECK(status IN ('borrowed', 'returned', 'overdue')),
      remark TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (equipment_id) REFERENCES equipments(id),
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    );
  `);

  console.log('数据库表初始化完成');
}

if (require.main === module) {
  initTables();
  console.log('数据库初始化成功');
}

module.exports = { initTables, EQUIPMENT_STATUS };
