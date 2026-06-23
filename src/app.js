const express = require('express');
const cors = require('cors');
const { initTables } = require('./db/init');
const { closeDb } = require('./db/connection');

const equipmentsRouter = require('./routes/equipments');
const employeesRouter = require('./routes/employees');
const borrowRouter = require('./routes/borrow');
const statisticsRouter = require('./routes/statistics');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

initTables();

app.use('/api/equipments', equipmentsRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/borrow', borrowRouter);
app.use('/api/statistics', statisticsRouter);

app.use((err, _req, res, _next) => {
  console.error('服务器错误:', err.message);
  res.status(500).json({ code: 1, message: '服务器内部错误' });
});

const server = app.listen(PORT, () => {
  console.log(`资产管理API服务已启动: http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
  console.log('\n正在关闭服务...');
  server.close(() => {
    closeDb();
    process.exit(0);
  });
});

module.exports = app;
