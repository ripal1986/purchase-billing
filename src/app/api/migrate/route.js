import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { getGoogleSheetsClient } from '@/lib/googleAuth';

const SPREADSHEET_ID = '1Xsb46eOHnii34YM_UEY3LERAFrggJZMrPzm1vVc8TNw';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function normalizeToYMD(dateStr, sheetName = '') {
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
      } else if (sheetName === 'Direct') {
        month = parts[0].padStart(2, '0');
        day = parts[1].padStart(2, '0');
      } else {
        day = parts[0].padStart(2, '0');
        month = parts[1].padStart(2, '0');
      }
    }
    return `${year}-${month}-${day}`;
  }
  return trimmed;
}

export async function POST(req) {
  try {
    const sql = getDb();
    if (!sql) {
      return NextResponse.json({ 
        success: false, 
        error: "DATABASE_URL is not configured. Please set DATABASE_URL in your environment variables." 
      }, { status: 400 });
    }

    await initDb();

    // 1. Fetch all rows from Google Sheets
    const sheets = getGoogleSheetsClient(true);

    const sheetResponse = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: SPREADSHEET_ID,
      ranges: ['APMC!A:AK', 'Direct!A:AK'],
    });

    const parseSheetRows = (rows, purchaseType) => {
      if (!rows || rows.length <= 1) return [];
      const list = [];
      for (let i = 1; i < rows.length; i++) {
        const rawRow = rows[i];
        // Only slice at 18 if columns A-D are all empty and data actually starts at column S (shifted row)
        const isShifted = !rawRow[0] && !rawRow[1] && !rawRow[3] && rawRow.length > 19;
        const row = isShifted ? rawRow.slice(18) : rawRow;
        
        // Skip if row is completely empty
        if (!row[0] && !row[1] && !row[2] && !row[3]) continue;

        list.push({
          voucherId: (row[0] || "").toString().trim(),
          purchaseType: purchaseType,
          date: (row[1] || "").toString().trim(),
          dailyPurchaseId: (row[2] || "").toString().trim(),
          farmerName: (row[3] || "").toString().trim(),
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

    // 2. Fetch existing records from Neon in a single fast query
    const existingRows = await sql`
      SELECT voucher_id, daily_purchase_id, date, purchase_type, farmer_name 
      FROM purchases
    `;

    const existingVoucherKeys = new Set();
    const existingDailyKeys = new Set();

    for (const r of existingRows) {
      const normDate = normalizeToYMD(r.date || '', r.purchase_type || '');
      const vId = (r.voucher_id || '').toString().trim();
      const dId = (r.daily_purchase_id || '').toString().trim();
      if (vId) {
        existingVoucherKeys.add(`${r.purchase_type}_${normDate}_${vId}`);
      }
      if (normDate && dId) {
        existingDailyKeys.add(`${r.purchase_type}_${normDate}_${dId}_${(r.farmer_name || '').trim()}`);
      }
    }

    // 3. Filter rows that need to be inserted
    const rowsToInsert = [];
    let skippedCount = 0;

    for (const r of allRows) {
      const normDate = normalizeToYMD(r.date, r.purchaseType);
      const vKey = `${r.purchaseType}_${normDate}_${r.voucherId}`;
      const dKey = `${r.purchaseType}_${normDate}_${r.dailyPurchaseId}_${r.farmerName}`;

      if (r.voucherId && existingVoucherKeys.has(vKey)) {
        skippedCount++;
        continue;
      }
      if (r.dailyPurchaseId && normDate && existingDailyKeys.has(dKey)) {
        skippedCount++;
        continue;
      }

      if (r.voucherId) existingVoucherKeys.add(vKey);
      if (r.dailyPurchaseId && normDate) existingDailyKeys.add(dKey);

      rowsToInsert.push(r);
    }

    // 4. Fast batch insertion in chunks of 25 with Promise.all
    let insertedCount = 0;
    const CHUNK_SIZE = 25;

    for (let i = 0; i < rowsToInsert.length; i += CHUNK_SIZE) {
      const chunk = rowsToInsert.slice(i, i + CHUNK_SIZE);
      await Promise.all(chunk.map(r => sql`
        INSERT INTO purchases (
          voucher_id, purchase_type, date, daily_purchase_id, farmer_name,
          village_name, mobile_number, variety, net_weight, deduction_grams,
          total_deduction, final_weight, purchase_rate, final_amount, status,
          cash_amount, cheque_amount, cheque_number, cheque_date, bank_name, items_json
        ) VALUES (
          ${r.voucherId}, ${r.purchaseType}, ${r.date}, ${String(r.dailyPurchaseId)}, ${r.farmerName},
          ${r.villageName}, ${r.mobileNumber}, ${r.variety}, ${r.netWeight}, ${r.deductionGrams},
          ${r.totalDeduction}, ${r.finalWeight}, ${r.purchaseRate}, ${r.finalAmount}, ${r.status},
          ${r.cashAmount}, ${r.chequeAmount}, ${r.chequeNumber}, ${r.chequeDate || r.date || ''}, ${r.bankName}, ${r.itemsJSON}
        );
      `));
      insertedCount += chunk.length;
    }

    return NextResponse.json({
      success: true,
      message: `માઈગ્રેશન સફળતાપૂર્વક પૂર્ણ થયું! ${insertedCount} નવી એન્ટ્રીઓ Neon માં ઉમેરાઈ, ${skippedCount} એન્ટ્રીઓ પહેલેથી હાજર હતી.`,
      insertedCount,
      skippedCount,
      totalSheetsRows: allRows.length
    });
  } catch (error) {
    console.error('Migration Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
