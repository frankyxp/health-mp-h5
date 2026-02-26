// server.js - 福善家事后端服务
// 依赖: npm install express better-sqlite3

const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== 中间件 ====================
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ==================== SQLite 初始化 ====================
const db = new Database(path.join(__dirname, 'recruits.db'));

// 开启 WAL 模式提升并发性能
db.pragma('journal_mode = WAL');

// 自动创建 recruits 表
db.exec(`
  CREATE TABLE IF NOT EXISTS recruits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    skills TEXT NOT NULL,
    submit_time TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

console.log('✅ SQLite 数据库初始化完成，recruits 表已就绪');

// ==================== API 接口 ====================

// POST /api/join - 提交合作意向
app.post('/api/join', (req, res) => {
  try {
    const { name, phone, skills, submitTime } = req.body;

    // 服务端校验
    if (!name || !name.trim()) {
      return res.json({ success: false, message: '姓名不能为空' });
    }
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return res.json({ success: false, message: '请输入正确的11位手机号码' });
    }
    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return res.json({ success: false, message: '请至少选择一个擅长领域' });
    }

    const skillsStr = skills.join('、');
    const stmt = db.prepare(
      'INSERT INTO recruits (name, phone, skills, submit_time) VALUES (?, ?, ?, ?)'
    );
    stmt.run(name.trim(), phone.trim(), skillsStr, submitTime || new Date().toLocaleString('zh-CN'));

    console.log(`📋 新报名: ${name} | ${phone} | ${skillsStr}`);
    res.json({ success: true, message: '提交成功' });
  } catch (err) {
    console.error('❌ 提交失败:', err.message);
    res.status(500).json({ success: false, message: '服务器错误，请稍后重试' });
  }
});

// ==================== 管理看板 ====================

// GET /fs-admin-888 - 移动端适配管理看板
app.get('/fs-admin-888', (req, res) => {
  const recruits = db.prepare('SELECT * FROM recruits ORDER BY created_at DESC').all();

  const rows = recruits.map((r, i) => `
    <div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:12px;box-shadow:0 2px 12px rgba(14,77,111,0.06);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-weight:700;color:#0e4d6f;font-size:16px;">${r.name}</span>
        <span style="font-size:12px;color:#8aacbe;">#${r.id}</span>
      </div>
      <div style="font-size:14px;color:#2a4a5a;margin-bottom:6px;">
        📱 <a href="tel:${r.phone}" style="color:#00BFFF;text-decoration:none;">${r.phone}</a>
      </div>
      <div style="font-size:13px;color:#6a8fa5;margin-bottom:6px;">
        🏷️ ${r.skills}
      </div>
      <div style="font-size:12px;color:#a0b8c8;">
        ⏰ ${r.submit_time}
      </div>
    </div>
  `).join('');

  res.send(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>福善家事 · 管理看板</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body {
          font-family: "PingFang SC","Microsoft YaHei","Helvetica Neue",Arial,sans-serif;
          background: #f0f7fc;
          min-height: 100vh;
          -webkit-font-smoothing: antialiased;
        }
        .header {
          background: linear-gradient(135deg, #0e4d6f 0%, #0a7ea8 50%, #00BFFF 100%);
          padding: 24px 20px 20px;
          color: #fff;
        }
        .header h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
        .header p { font-size: 13px; opacity: 0.8; }
        .stats {
          display: flex; gap: 12px; padding: 16px 20px;
        }
        .stat-card {
          flex: 1; background: #fff; border-radius: 12px; padding: 16px; text-align: center;
          box-shadow: 0 2px 12px rgba(14,77,111,0.06);
        }
        .stat-num { font-size: 28px; font-weight: 800; color: #00BFFF; }
        .stat-label { font-size: 12px; color: #8aacbe; margin-top: 4px; }
        .list { padding: 0 20px 40px; }
        .empty { text-align:center; padding:60px 20px; color:#a0b8c8; font-size:15px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🏥 福善家事 · 管理看板</h1>
        <p>社区健康管家招募管理后台</p>
      </div>
      <div class="stats">
        <div class="stat-card">
          <div class="stat-num">${recruits.length}</div>
          <div class="stat-label">总报名人数</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">${recruits.filter(r => {
            const d = new Date(r.created_at);
            const now = new Date();
            return d.toDateString() === now.toDateString();
          }).length}</div>
          <div class="stat-label">今日新增</div>
        </div>
      </div>
      <div class="list">
        ${recruits.length > 0 ? rows : '<div class="empty">暂无报名数据</div>'}
      </div>
    </body>
    </html>
  `);
});

// ==================== 启动服务 ====================
app.listen(PORT, () => {
  console.log(`🚀 福善家事服务已启动: http://localhost:${PORT}`);
  console.log(`📊 管理看板地址: http://localhost:${PORT}/fs-admin-888`);
});
