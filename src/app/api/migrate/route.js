import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { getGoogleSheetsClient } from '@/lib/googleAuth';

const SPREADSHEET_ID = '1Xsb46eOHnii34YM_UEY3LERAFrggJZMrPzm1vVc8TNw';

export const dynamic = 'force-dynamic';

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
        const row = (!rawRow[0] && rawRow[18]) ? rawRow.slice(18) : rawRow;
        
        // Skip if row is completely empty
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

    let insertedCount = 0;
    let skippedCount = 0;

    for (const r of allRows) {
      // Check if already exists by voucherId if non-empty, or by dailyPurchaseId + date + type
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
        skippedCount++;
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
      insertedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Migration completed successfully! Inserted ${insertedCount} rows, skipped ${skippedCount} existing rows.`,
      insertedCount,
      skippedCount,
      totalSheetsRows: allRows.length
    });
  } catch (error) {
    console.error('Migration Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
