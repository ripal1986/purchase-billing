import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import path from 'path';
import { getDb, initDb } from '@/lib/db';

const SPREADSHEET_ID = '1Xsb46eOHnii34YM_UEY3LERAFrggJZMrPzm1vVc8TNw';

async function updateGoogleSheets({ sheetToUpdate, oldSheetName, rowIndex, rowValues }) {
  try {
    let authOptions = { scopes: ['https://www.googleapis.com/auth/spreadsheets'] };
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

    if (oldSheetName && oldSheetName !== sheetToUpdate) {
      // Clear old row
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${oldSheetName}!A${rowIndex}:S${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [Array(19).fill("DELETED (MOVED)")] },
      });
      // Append to new sheet
      const response = await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetToUpdate}!A:A`,
        insertDataOption: 'INSERT_ROWS',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowValues] },
      });
      return response.data;
    } else {
      const response = await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetToUpdate}!A${rowIndex}:S${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowValues] },
      });
      return response.data;
    }
  } catch (err) {
    console.error("Google Sheets Update Error:", err.message);
    return null;
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { 
      id,
      sheetName,
      oldSheetName,
      rowIndex,
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
      bankName,
      itemsJSON
    } = body;

    const sheetToUpdate = sheetName || 'APMC';
    const purchaseType = (sheetToUpdate === 'APMC' || sheetToUpdate === 'Sheet1') ? 'APMC' : 'Direct';

    const rowValues = [
      voucherId || "",
      date || "",
      dailyPurchaseId || "",
      farmerName || "",
      variety || "",
      netWeight ?? "",
      deductionGrams ?? "",
      totalDeduction ?? "",
      finalWeight ?? "",
      purchaseRate ?? "",
      finalAmount ?? "",
      status || "Completed",
      cashAmount || "",
      chequeAmount || "",
      chequeNumber || "",
      mobileNumber || "",
      bankName || "",
      typeof itemsJSON === 'string' ? itemsJSON : JSON.stringify(itemsJSON || []),
      villageName || ""
    ];

    const sql = getDb();
    if (sql) {
      try {
        await initDb();
        const parsedId = parseInt(id, 10);
        let updatedRows;

        if (!isNaN(parsedId) && parsedId > 0) {
          updatedRows = await sql`
            UPDATE purchases SET
              voucher_id = COALESCE(NULLIF(${voucherId || ''}, ''), voucher_id),
              purchase_type = ${purchaseType},
              date = ${date || ''},
              daily_purchase_id = ${dailyPurchaseId ? String(dailyPurchaseId) : ''},
              farmer_name = ${farmerName || ''},
              village_name = ${villageName || ''},
              mobile_number = ${mobileNumber || ''},
              variety = ${variety || ''},
              net_weight = ${parseFloat(netWeight) || 0},
              deduction_grams = ${parseFloat(deductionGrams) || 0},
              total_deduction = ${parseFloat(totalDeduction) || 0},
              final_weight = ${parseFloat(finalWeight) || 0},
              purchase_rate = ${parseFloat(purchaseRate) || 0},
              final_amount = ${parseFloat(finalAmount) || 0},
              status = ${status || 'Completed'},
              cash_amount = ${parseFloat(cashAmount) || 0},
              cheque_amount = ${parseFloat(chequeAmount) || 0},
              cheque_number = ${chequeNumber || ''},
              bank_name = ${bankName || ''},
              items_json = ${typeof itemsJSON === 'string' ? itemsJSON : JSON.stringify(itemsJSON || [])},
              updated_at = NOW()
            WHERE id = ${parsedId}
            RETURNING id;
          `;
        } else if (voucherId) {
          updatedRows = await sql`
            UPDATE purchases SET
              purchase_type = ${purchaseType},
              date = ${date || ''},
              daily_purchase_id = ${dailyPurchaseId ? String(dailyPurchaseId) : ''},
              farmer_name = ${farmerName || ''},
              village_name = ${villageName || ''},
              mobile_number = ${mobileNumber || ''},
              variety = ${variety || ''},
              net_weight = ${parseFloat(netWeight) || 0},
              deduction_grams = ${parseFloat(deductionGrams) || 0},
              total_deduction = ${parseFloat(totalDeduction) || 0},
              final_weight = ${parseFloat(finalWeight) || 0},
              purchase_rate = ${parseFloat(purchaseRate) || 0},
              final_amount = ${parseFloat(finalAmount) || 0},
              status = ${status || 'Completed'},
              cash_amount = ${parseFloat(cashAmount) || 0},
              cheque_amount = ${parseFloat(chequeAmount) || 0},
              cheque_number = ${chequeNumber || ''},
              bank_name = ${bankName || ''},
              items_json = ${typeof itemsJSON === 'string' ? itemsJSON : JSON.stringify(itemsJSON || [])},
              updated_at = NOW()
            WHERE voucher_id = ${voucherId}
            RETURNING id;
          `;
        }

        // Also sync Google Sheets if rowIndex is available
        if (rowIndex) {
          updateGoogleSheets({ sheetToUpdate, oldSheetName, rowIndex, rowValues }).catch(e => console.error(e));
        }

        return NextResponse.json({ success: true, source: 'neon', updated: updatedRows?.length || 0 });
      } catch (dbErr) {
        console.error("Neon DB Update Error, falling back to Google Sheets:", dbErr);
      }
    }

    // Google Sheets primary / fallback
    if (!rowIndex) {
      return NextResponse.json({ success: false, error: "Row index or valid ID is required for update" }, { status: 400 });
    }

    const sheetData = await updateGoogleSheets({ sheetToUpdate, oldSheetName, rowIndex, rowValues });
    return NextResponse.json({ success: true, source: 'sheets', response: sheetData });
  } catch (error) {
    console.error('Update Purchase Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
