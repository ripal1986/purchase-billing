import { neon } from '@neondatabase/serverless';

let dbInitialized = false;

export function getDb() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) return null;
  try {
    return neon(url);
  } catch (err) {
    console.error("Neon DB connection error:", err);
    return null;
  }
}

export async function initDb() {
  const sql = getDb();
  if (!sql) return false;
  if (dbInitialized) return true;

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS purchases (
        id SERIAL PRIMARY KEY,
        voucher_id VARCHAR(100),
        purchase_type VARCHAR(50) NOT NULL,
        date VARCHAR(50) NOT NULL,
        daily_purchase_id VARCHAR(50),
        farmer_name VARCHAR(255),
        village_name VARCHAR(255),
        mobile_number VARCHAR(50),
        variety VARCHAR(100),
        net_weight NUMERIC(12, 2) DEFAULT 0,
        deduction_grams NUMERIC(12, 2) DEFAULT 0,
        total_deduction NUMERIC(12, 2) DEFAULT 0,
        final_weight NUMERIC(12, 2) DEFAULT 0,
        purchase_rate NUMERIC(12, 2) DEFAULT 0,
        final_amount NUMERIC(12, 2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Pending',
        cash_amount NUMERIC(12, 2) DEFAULT 0,
        cheque_amount NUMERIC(12, 2) DEFAULT 0,
        cheque_number VARCHAR(100),
        bank_name VARCHAR(255),
        items_json TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(date);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_purchases_type ON purchases(purchase_type);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_purchases_daily_id ON purchases(daily_purchase_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_purchases_voucher_id ON purchases(voucher_id);`;

    dbInitialized = true;
    return true;
  } catch (err) {
    console.error("Error initializing Neon database schema:", err);
    return false;
  }
}

export function formatDbRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    sheetName: row.purchase_type === 'APMC' ? 'APMC' : 'Direct',
    purchaseType: row.purchase_type || 'APMC',
    rowIndex: row.id,
    voucherId: row.voucher_id || '',
    date: row.date || '',
    dailyPurchaseId: row.daily_purchase_id ? String(row.daily_purchase_id) : '',
    farmerName: row.farmer_name || '',
    variety: row.variety || '',
    netWeight: row.net_weight !== null && row.net_weight !== undefined ? String(row.net_weight) : '',
    deductionGrams: row.deduction_grams !== null && row.deduction_grams !== undefined ? String(row.deduction_grams) : '',
    totalDeduction: row.total_deduction !== null && row.total_deduction !== undefined ? String(row.total_deduction) : '',
    finalWeight: row.final_weight !== null && row.final_weight !== undefined ? String(row.final_weight) : '',
    purchaseRate: row.purchase_rate !== null && row.purchase_rate !== undefined ? String(row.purchase_rate) : '',
    finalAmount: row.final_amount !== null && row.final_amount !== undefined ? String(row.final_amount) : '',
    status: row.status || 'Pending',
    cashAmount: row.cash_amount !== null && row.cash_amount !== undefined ? String(row.cash_amount) : '',
    chequeAmount: row.cheque_amount !== null && row.cheque_amount !== undefined ? String(row.cheque_amount) : '',
    chequeNumber: row.cheque_number || '',
    mobileNumber: row.mobile_number || '',
    bankName: row.bank_name || '',
    itemsJSON: row.items_json || '[]',
    villageName: row.village_name || ''
  };
}
