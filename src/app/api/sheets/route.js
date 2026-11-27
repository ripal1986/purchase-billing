import { NextResponse } from 'next/server';
import { getDb, initDb, normalizeToYMD } from '@/lib/db';
import { getGoogleSheetsClient } from '@/lib/googleAuth';

const SPREADSHEET_ID = '1Xsb46eOHnii34YM_UEY3LERAFrggJZMrPzm1vVc8TNw';

async function appendToGoogleSheets(sheetToUpdate, rowValues) {
  try {
    const sheets = getGoogleSheetsClient(false);

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetToUpdate}!A:A`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [rowValues] },
    });
    return response.data;
  } catch (err) {
    console.error("Background Google Sheets Append Warning:", err.message);
    return null;
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { 
      sheetName,
      voucherId, 
      date, 
      dailyPurchaseId,
      farmerName, 
      villageName,
      mobileNumber,
      variety,
      netWeight, 
      deductionGrams, 
      totalDeduction,
      finalWeight,
      purchaseRate,
      finalAmount,
      parchiPhotoUrl,
      gatepassPhotoUrl,
      status,
      cashAmount,
      chequeAmount,
      chequeNumber,
      chequeDate,
      bankName,
      itemsJSON
    } = body;

    const sheetToUpdate = sheetName || 'APMC';
    const purchaseType = (sheetToUpdate === 'APMC' || sheetToUpdate === 'Sheet1') ? 'APMC' : 'Direct';
    const normDate = normalizeToYMD(date || '', purchaseType, dailyPurchaseId || '');

    const sheetRowValues = [
      voucherId || "",
      normDate || date || "",
      dailyPurchaseId || "",
      farmerName || "",
      variety || "",
      netWeight ?? "",
      deductionGrams ?? "",
      totalDeduction ?? "",
      finalWeight ?? "",
      purchaseRate ?? "",
      finalAmount ?? "",
      status || "Pending",
      cashAmount || "",
      chequeAmount || "",
      chequeNumber || "",
      mobileNumber || "",
      bankName || "",
      itemsJSON || "[]",
      villageName || ""
    ];

    const sql = getDb();
    if (sql) {
      try {
        await initDb();
        const result = await sql`
          INSERT INTO purchases (
            voucher_id, purchase_type, date, daily_purchase_id, farmer_name,
            village_name, mobile_number, variety, net_weight, deduction_grams,
            total_deduction, final_weight, purchase_rate, final_amount, status,
            cash_amount, cheque_amount, cheque_number, cheque_date, bank_name, items_json
          ) VALUES (
            ${voucherId || ''},
            ${purchaseType},
            ${normDate || date || ''},
            ${dailyPurchaseId ? String(dailyPurchaseId) : ''},
            ${farmerName || ''},
            ${villageName || ''},
            ${mobileNumber || ''},
            ${variety || ''},
            ${parseFloat(netWeight) || 0},
            ${parseFloat(deductionGrams) || 0},
            ${parseFloat(totalDeduction) || 0},
            ${parseFloat(finalWeight) || 0},
            ${parseFloat(purchaseRate) || 0},
            ${parseFloat(finalAmount) || 0},
            ${status || 'Pending'},
            ${parseFloat(cashAmount) || 0},
            ${parseFloat(chequeAmount) || 0},
            ${chequeNumber || ''},
            ${chequeDate || ''},
            ${bankName || ''},
            ${typeof itemsJSON === 'string' ? itemsJSON : JSON.stringify(itemsJSON || [])}
          )
          RETURNING id;
        `;

        // Sync to Google Sheets in background as backup
        appendToGoogleSheets(sheetToUpdate, sheetRowValues).catch(e => console.error(e));

        return NextResponse.json({ 
          success: true, 
          source: 'neon', 
          id: result[0]?.id 
        });
      } catch (dbErr) {
        console.error("Neon DB Insert Error, attempting Google Sheets fallback:", dbErr);
      }
    }

    // Google Sheets primary/fallback
    const sheetData = await appendToGoogleSheets(sheetToUpdate, sheetRowValues);
    if (!sheetData) {
      throw new Error("Failed to append row to Google Sheets");
    }

    return NextResponse.json({ success: true, source: 'sheets', data: sheetData });
  } catch (error) {
    console.error('Save Purchase Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
