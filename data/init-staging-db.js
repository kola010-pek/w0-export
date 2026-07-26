// Initialize staging database with realistic financial data
// Note: 2026-07-26 is Sunday (non-trading day), use 2026-07-24 (Friday) as latest trading day

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'staging.db');

// Remove existing database
const fs = require('fs');
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const db = new Database(dbPath);

// Latest trading day: 2026-07-24 (Friday)
const LATEST_TRADING_DAY = '2026-07-24';
const PREV_TRADING_DAY = '2026-07-23';

try {
  // Create daily_kline table
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_kline (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stock_code TEXT NOT NULL,
      trade_date TEXT NOT NULL,
      open_price REAL NOT NULL,
      high_price REAL NOT NULL,
      low_price REAL NOT NULL,
      close_price REAL NOT NULL,
      volume REAL NOT NULL,
      amount REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create adjustment_factors table
  db.exec(`
    CREATE TABLE IF NOT EXISTS adjustment_factors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stock_code TEXT NOT NULL,
      trade_date TEXT NOT NULL,
      adjustment_factor REAL NOT NULL,
      adjustment_type TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create factor_data table
  db.exec(`
    CREATE TABLE IF NOT EXISTS factor_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stock_code TEXT NOT NULL,
      trade_date TEXT NOT NULL,
      factor_name TEXT NOT NULL,
      factor_value REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create market_factors table
  db.exec(`
    CREATE TABLE IF NOT EXISTS market_factors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      factor_name TEXT NOT NULL,
      trade_date TEXT NOT NULL,
      factor_value REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert realistic daily_kline data (latest trading day: 2026-07-24)
  const klineStmt = db.prepare(`
    INSERT INTO daily_kline (stock_code, trade_date, open_price, high_price, low_price, close_price, volume, amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const stocks = ['000001.SZ', '000002.SZ', '600000.SH', '600036.SH', '601318.SH'];
  
  for (const stock of stocks) {
    // Insert data for multiple trading days
    klineStmt.run(stock, LATEST_TRADING_DAY, 10.5 + Math.random(), 11.0 + Math.random(), 10.3 + Math.random(), 10.8 + Math.random() * 0.5, 1000000 + Math.random() * 500000, 10000000 + Math.random() * 5000000);
    klineStmt.run(stock, PREV_TRADING_DAY, 10.3 + Math.random(), 10.8 + Math.random(), 10.1 + Math.random(), 10.5 + Math.random() * 0.5, 900000 + Math.random() * 500000, 9000000 + Math.random() * 5000000);
    klineStmt.run(stock, '2026-07-22', 10.1 + Math.random(), 10.6 + Math.random(), 9.9 + Math.random(), 10.3 + Math.random() * 0.5, 800000 + Math.random() * 500000, 8000000 + Math.random() * 5000000);
  }

  // Insert adjustment_factors data
  const adjStmt = db.prepare(`
    INSERT INTO adjustment_factors (stock_code, trade_date, adjustment_factor, adjustment_type)
    VALUES (?, ?, ?, ?)
  `);

  for (const stock of stocks) {
    adjStmt.run(stock, LATEST_TRADING_DAY, 1.0 + Math.random() * 0.1, 'dividend');
    adjStmt.run(stock, PREV_TRADING_DAY, 1.0 + Math.random() * 0.1, 'split');
  }

  // Insert factor_data
  const factorStmt = db.prepare(`
    INSERT INTO factor_data (stock_code, trade_date, factor_name, factor_value)
    VALUES (?, ?, ?, ?)
  `);

  const factors = ['pe_ratio', 'pb_ratio', 'market_cap', 'turnover_rate', 'volatility'];
  
  for (const stock of stocks) {
    for (const factor of factors) {
      factorStmt.run(stock, LATEST_TRADING_DAY, factor, Math.random() * 100);
      factorStmt.run(stock, PREV_TRADING_DAY, factor, Math.random() * 100);
    }
  }

  // Insert market_factors
  const marketStmt = db.prepare(`
    INSERT INTO market_factors (factor_name, trade_date, factor_value)
    VALUES (?, ?, ?)
  `);

  const marketFactors = ['shanghai_index', 'shenzhen_index', 'csi_300', 'risk_free_rate', 'market_volatility'];
  
  for (const factor of marketFactors) {
    marketStmt.run(factor, LATEST_TRADING_DAY, 3000 + Math.random() * 500);
    marketStmt.run(factor, PREV_TRADING_DAY, 3000 + Math.random() * 500);
  }

  console.log('Staging database initialized with realistic financial data');
  console.log(`Latest trading day: ${LATEST_TRADING_DAY} (Friday)`);
  console.log(`Note: 2026-07-26 is Sunday (non-trading day)`);
  
  // Print table counts
  const tables = ['daily_kline', 'adjustment_factors', 'factor_data', 'market_factors'];
  for (const table of tables) {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
    console.log(`  ${table}: ${count.count} rows`);
  }

} catch (err) {
  console.error('Error initializing database:', err);
  process.exit(1);
} finally {
  db.close();
}
