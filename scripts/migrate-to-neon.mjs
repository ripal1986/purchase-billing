import { neon } from '@neondatabase/serverless';
import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

// Load .env.local if present
try {
  const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [k, ...v] = trimmed.split('=');
    if (k && v.length) {
      process.env[k.trim()] = v.join('=').trim();
    }
  }
} catch (e) {
  // Ignore if no .env.local
}

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is not set in environment or .env.local");
  process.exit(1);
}

const SPREADSHEET_ID = '1Xsb46eOHnii34YM_UEY3LERAFrggJZMrPzm1vVc8TNw';
const sql = neon(DATABASE_URL);

async function run() {
  console.log("Connecting to Neon Postgres...");
  
  // Init schema
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

  console.log("Neon Postgres tables initialized.");

  // Fetch Google Sheets
  console.log("Fetching Google Sheets data...");
  let authOptions = { scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] };
  if (process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_CLIENT_EMAIL) {
    authOptions.credentials = {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  } else {
    authOptions.keyFile = path.join(process.cwd(), 'google-credentials.json');
  }
  const auth = new google.auth.GoogleAuth(authOptions);
  const sheets = google.sheets({ version: 'v4', auth });

  const sheetResponse = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: SPREADSHEET_ID,
    ranges: ['APMC!A:AK', 'Direct!A:AK'],
  });

  const parseSheetRows = (rows, purchaseType) => {
    if (!rows || rows.length <= 1) return [];
    const list = [];
    for (let i = 1; i < rows.length; i++) {
      const rawRow = rows[i];
      const row = (!rawRow[0] && rawRow[18]) ? rawRow.slice(18) : rawRow;
      if (!row[0] && !row[1] && !row[2] && !row[3]) continue;
      list.push({
        voucherId: row[0] || "",
        purchaseType: purchaseType,
        date: row[1] || "",
        dailyPurchaseId: row[2] || "",
        farmerName: row[3] || "",
        variety: row[4] || "",
        netWeight: parseFloat(row[5]) || 0,
        deductionGrams: parseFloat(row[6]) || 0,
        totalDeduction: parseFloat(row[7]) || 0,
        finalWeight: parseFloat(row[8]) || 0,
        purchaseRate: parseFloat(row[9]) || 0,
        finalAmount: parseFloat(row[10]) || 0,
        status: row[11] || "Pending",
        cashAmount: parseFloat(row[12]) || 0,
        chequeAmount: parseFloat(row[13]) || 0,
        chequeNumber: row[14] || "",
        mobileNumber: row[15] || "",
        bankName: row[16] || "",
        itemsJSON: row[17] || "[]",
        villageName: row[18] || ""
      });
    }
    return list;
  };

  const apmcRows = parseSheetRows(sheetResponse.data.valueRanges[0].values, 'APMC');
  const directRows = parseSheetRows(sheetResponse.data.valueRanges[1].values, 'Direct');
  const allRows = [...apmcRows, ...directRows];

  console.log(`Found ${apmcRows.length} APMC rows and ${directRows.length} Direct rows. Total: ${allRows.length}`);

  let inserted = 0;
  let skipped = 0;

  for (const r of allRows) {
    let existing = [];
    if (r.voucherId) {
      existing = await sql`
        SELECT id FROM purchases 
        WHERE voucher_id = ${r.voucherId} 
        LIMIT 1
      `;
    } else if (r.dailyPurchaseId && r.date) {
      existing = await sql`
        SELECT id FROM purchases 
        WHERE daily_purchase_id = ${String(r.dailyPurchaseId)} 
          AND date = ${r.date} 
          AND purchase_type = ${r.purchaseType} 
        LIMIT 1
      `;
    }

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    await sql`
      INSERT INTO purchases (
        voucher_id, purchase_type, date, daily_purchase_id, farmer_name,
        village_name, mobile_number, variety, net_weight, deduction_grams,
        total_deduction, final_weight, purchase_rate, final_amount, status,
        cash_amount, cheque_amount, cheque_number, bank_name, items_json
      ) VALUES (
        ${r.voucherId}, ${r.purchaseType}, ${r.date}, ${String(r.dailyPurchaseId)}, ${r.farmerName},
        ${r.villageName}, ${r.mobileNumber}, ${r.variety}, ${r.netWeight}, ${r.deductionGrams},
        ${r.totalDeduction}, ${r.finalWeight}, ${r.purchaseRate}, ${r.finalAmount}, ${r.status},
        ${r.cashAmount}, ${r.chequeAmount}, ${r.chequeNumber}, ${r.bankName}, ${r.itemsJSON}
      );
    `;
    inserted++;
  }

  console.log(`Migration Complete! Inserted: ${inserted}, Skipped: ${skipped}`);
}

run().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
