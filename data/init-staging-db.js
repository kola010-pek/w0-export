#!/usr/bin/env node
// Initialize staging SQLite database with sample data
// This script creates the required tables and populates them with test data

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'staging.db');

console.log('Initializing staging database at:', DB_PATH);

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

// Create tables
console.log('Creating tables...');

// daily_kline: Daily K-line data
db.exec(`
  CREATE TABLE IF NOT EXISTS daily_kline (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    trade_date TEXT NOT NULL,
    open REAL,
    high REAL,
    low REAL,
    close REAL,
    volume REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// adjustment_factors: Adjustment factors for price normalization
db.exec(`
  CREATE TABLE IF NOT EXISTS adjustment_factors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    trade_date TEXT NOT NULL,
    factor REAL NOT NULL,
    factor_type TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// factor_data: Computed factor data
db.exec(`
  CREATE TABLE IF NOT EXISTS factor_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    trade_date TEXT NOT NULL,
    factor_name TEXT NOT NULL,
    factor_value REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// market_factors: Market-wide factor data
db.exec(`
  CREATE TABLE IF NOT EXISTS market_factors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trade_date TEXT NOT NULL,
    factor_name TEXT NOT NULL,
    factor_value REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// Insert sample data
console.log('Inserting sample data...');

const today = new Date();
const dates = [];
for (let i = 0; i < 5; i++) {
  const d = new Date(today);
  d.setDate(d.getDate() - i);
  dates.push(d.toISOString().split('T')[0]);
}

const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];

// Insert daily_kline data
const insertKline = db.prepare(`
  INSERT INTO daily_kline (symbol, trade_date, open, high, low, close, volume)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

for (const date of dates) {
  for (const symbol of symbols) {
    const basePrice = 100 + Math.random() * 100;
    insertKline.run(
      symbol,
      date,
      basePrice,
      basePrice * 1.02,
      basePrice * 0.98,
      basePrice * (1 + (Math.random() - 0.5) * 0.04),
      1000000 + Math.random() * 5000000
    );
  }
}

// Insert adjustment_factors data
const insertFactors = db.prepare(`
  INSERT INTO adjustment_factors (symbol, trade_date, factor, factor_type)
  VALUES (?, ?, ?, ?)
`);

for (const date of dates) {
  for (const symbol of symbols) {
    insertFactors.run(symbol, date, 1.0 + Math.random() * 0.01, 'split');
  }
}

// Insert factor_data
const insertFactorData = db.prepare(`
  INSERT INTO factor_data (symbol, trade_date, factor_name, factor_value)
  VALUES (?, ?, ?, ?)
`);

const factorNames = ['momentum_20d', 'volatility_20d', 'mean_reversion_5d'];
for (const date of dates) {
  for (const symbol of symbols) {
    for (const factorName of factorNames) {
      insertFactorData.run(symbol, date, factorName, Math.random());
    }
  }
}

// Insert market_factors
const insertMarketFactors = db.prepare(`
  INSERT INTO market_factors (trade_date, factor_name, factor_value)
  VALUES (?, ?, ?)
`);

const marketFactorNames = ['market_return', 'market_volatility', 'risk_free_rate'];
for (const date of dates) {
  for (const factorName of marketFactorNames) {
    insertMarketFactors.run(date, factorName, Math.random());
  }
}

// Verify data
console.log('\nData summary:');
const tables = ['daily_kline', 'adjustment_factors', 'factor_data', 'market_factors'];
for (const table of tables) {
  const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
  console.log(`  ${table}: ${count.count} rows`);
}

// Show latest dates
console.log('\nLatest trade dates:');
for (const table of tables) {
  try {
    const row = db.prepare(`SELECT MAX(trade_date) as max_date FROM ${table}`).get();
    console.log(`  ${table}: ${row.max_date}`);
  } catch {
    console.log(`  ${table}: (no date column)`);
  }
}

db.close();
console.log('\nDatabase initialized successfully!');
