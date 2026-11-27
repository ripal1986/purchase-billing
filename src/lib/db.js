import { neon } from '@neondatabase/serverless';

export function normalizeToYMD(dateStr, sheetName = '', dailyPurchaseId = '') {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const trimmed = dateStr.trim();
  if (!trimmed) return '';

  const parts = trimmed.split(/[/.-]/);
  if (parts.length === 3) {
    let year, month, day;
    if (parts[0].length === 4) {
      year = parts[0];
      month = parts[1].padStart(2, '0');
      day = parts[2].padStart(2, '0');
    } else {
      year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);

      if (p0 > 12) {
        day = parts[0].padStart(2, '0');
        month = parts[1].padStart(2, '0');
      } else if (p1 > 12) {
        month = parts[0].padStart(2, '0');
        day = parts[1].padStart(2, '0');
      } else {
        // Ambiguous (both <= 12): check dailyPurchaseId (e.g. PUR-20261105-001) first
        const purMatch = (dailyPurchaseId || '').match(/PUR-(\d{4})(\d{2})(\d{2})/i);
        if (purMatch) {
          const dMonth = parseInt(purMatch[2], 10);
          const dDay = parseInt(purMatch[3], 10);
          if ((p0 === dMonth && p1 === dDay) || (p0 === dDay && p1 === dMonth)) {
            month = purMatch[2];
            day = purMatch[3];
            return `${year}-${month}-${day}`;
          }
        }
        // Google Sheets US format uses MM/DD/YYYY (4-digit year with '/')
        if (parts[2].length === 4 && trimmed.includes('/')) {
          month = parts[0].padStart(2, '0');
          day = parts[1].padStart(2, '0');
        } else if (sheetName === 'Direct') {
          month = parts[0].padStart(2, '0');
          day = parts[1].padStart(2, '0');
        } else {
          day = parts[0].padStart(2, '0');
          month = parts[1].padStart(2, '0');
        }
      }
    }
    return `${year}-${month}-${day}`;
  }
  return trimmed;
}

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
        cheque_date VARCHAR(50),
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
    try {
      await sql`ALTER TABLE purchases ADD COLUMN IF NOT EXISTS cheque_date VARCHAR(50);`;
    } catch (e) {
      // Column might already exist or table created with it
    }

    // PAYMENTS & RECEIPTS TABLE
    await sql`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        receipt_no VARCHAR(100),
        payment_type VARCHAR(50) NOT NULL DEFAULT 'Payment',
        date VARCHAR(50) NOT NULL,
        party_name VARCHAR(255) NOT NULL,
        village_name VARCHAR(255),
        mobile_number VARCHAR(50),
        payment_mode VARCHAR(50) DEFAULT 'Cash',
        amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
        cheque_number VARCHAR(100),
        cheque_date VARCHAR(50),
        bank_name VARCHAR(255),
        reference_bill_no VARCHAR(100),
        remarks TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_payments_party ON payments(party_name);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type);`;

    // REMOTE PRINT JOBS QUEUE TABLE
    await sql`
      CREATE TABLE IF NOT EXISTS print_jobs (
        id SERIAL PRIMARY KEY,
        target_device VARCHAR(100) NOT NULL,
        job_type VARCHAR(50) NOT NULL DEFAULT 'invoice',
        voucher_id VARCHAR(100),
        party_name VARCHAR(255),
        payload_json JSONB NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        printed_at TIMESTAMP WITH TIME ZONE
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_print_jobs_device_status ON print_jobs(target_device, status);`;

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
    date: normalizeToYMD(row.date || '', row.purchase_type || '', row.daily_purchase_id || ''),
    dailyPurchaseId: row.daily_purchase_id ? String(row.daily_purchase_id) : '',
    farmerName: row.farmer_name || '',
    variety: row.variety || '',
    netWeight: row.net_weight !== null && row.net_weight !== undefined ? String(row.net_weight) : '',
    deductionGrams: row.deduction_grams !== null && row.deduction_grams !== undefined ? String(row.deduction_grams) : '',
    totalDeduction: row.total_deduction !== null && row.total_deduction !== undefined ? String(row.total_deduction) : '',
    finalWeight: row.final_weight !== null && row.final_weight !== undefined ? String(Math.floor(Number(row.final_weight))) : '',
    purchaseRate: row.purchase_rate !== null && row.purchase_rate !== undefined ? String(row.purchase_rate) : '',
    finalAmount: row.final_amount !== null && row.final_amount !== undefined ? String(row.final_amount) : '',
    status: row.status || 'Pending',
    cashAmount: row.cash_amount !== null && row.cash_amount !== undefined ? String(row.cash_amount) : '',
    chequeAmount: row.cheque_amount !== null && row.cheque_amount !== undefined ? String(row.cheque_amount) : '',
    chequeNumber: row.cheque_number || '',
    chequeDate: row.cheque_date || '',
    mobileNumber: row.mobile_number || '',
    bankName: row.bank_name || '',
    itemsJSON: row.items_json || '[]',
    villageName: row.village_name || ''
  };
}

export function formatPaymentRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    receiptNo: row.receipt_no || '',
    paymentType: row.payment_type || 'Payment',
    date: row.date || '',
    partyName: row.party_name || '',
    villageName: row.village_name || '',
    mobileNumber: row.mobile_number || '',
    paymentMode: row.payment_mode || 'Cash',
    amount: row.amount !== null && row.amount !== undefined ? Number(row.amount) : 0,
    chequeNumber: row.cheque_number || '',
    chequeDate: row.cheque_date || '',
    bankName: row.bank_name || '',
    referenceBillNo: row.reference_bill_no || '',
    remarks: row.remarks || '',
    createdAt: row.created_at || ''
  };
}
