import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import path from 'path';
import { getDb, initDb, formatDbRow } from '@/lib/db';

const SPREADSHEET_ID = '1Xsb46eOHnii34YM_UEY3LERAFrggJZMrPzm1vVc8TNw';

export const dynamic = 'force-dynamic';

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

export async function GET(request) {
  const url = new URL(request.url);
  const limit = url.searchParams.get('limit');
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');
  const forceSheets = url.searchParams.get('forceSheets') === 'true';

  // 1. Try reading from Neon Postgres if available and not forced to Sheets
  const sql = getDb();
  if (sql && !forceSheets) {
    try {
      await initDb();
      const neonRows = await sql`
        SELECT * FROM purchases 
        ORDER BY id DESC
      `;

      if (neonRows && neonRows.length > 0) {
        let allData = neonRows.map(formatDbRow);

        // Sort by dailyPurchaseId descending (numeric aware)
        allData.sort((a, b) => {
          const numA = parseInt(a.dailyPurchaseId, 10);
          const numB = parseInt(b.dailyPurchaseId, 10);
          if (!isNaN(numA) && !isNaN(numB)) {
            return numB - numA;
          }
          return (b.dailyPurchaseId || '').localeCompare(a.dailyPurchaseId || '');
        });

        if (startDate && endDate) {
          const normStart = normalizeToYMD(startDate);
          const normEnd = normalizeToYMD(endDate);
          allData = allData.filter(e => {
            const entryDateStr = normalizeToYMD(e.date, e.sheetName);
            return entryDateStr && entryDateStr >= normStart && entryDateStr <= normEnd;
          });
        } else if (limit) {
          const numLimit = parseInt(limit, 10);
          if (!isNaN(numLimit) && numLimit > 0) {
            allData = allData.slice(0, numLimit);
          }
        }

        return NextResponse.json({
          success: true,
          source: 'neon',
          count: allData.length,
          data: allData
        });
      }
    } catch (neonErr) {
      console.error('Neon Read Error, falling back to Google Sheets:', neonErr);
    }
  }

  // 2. Fallback to Google Sheets
  try {
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

    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: SPREADSHEET_ID,
      ranges: ['APMC!A:AK', 'Direct!A:AK'],
    });

    const formatRows = (rows, sheetName) => {
      if (!rows || rows.length <= 1) return [];
      const formattedData = [];
      const startIndex = 1;
      
      for (let i = startIndex; i < rows.length; i++) {
        const rawRow = rows[i];
        const row = (!rawRow[0] && rawRow[18]) ? rawRow.slice(18) : rawRow;
        formattedData.push({
          sheetName: sheetName,
          purchaseType: (sheetName === 'APMC' || sheetName === 'Sheet1') ? 'APMC' : 'Direct',
          rowIndex: i + 1,
          voucherId: row[0] || "",
          date: row[1] || "",
          dailyPurchaseId: row[2] || "",
          farmerName: row[3] || "",
          variety: row[4] || "",
          netWeight: row[5] || "",
          deductionGrams: row[6] || "",
          totalDeduction: row[7] || "",
          finalWeight: row[8] || "",
          purchaseRate: row[9] || "",
          finalAmount: row[10] || "",
          status: row[11] || "Pending",
          cashAmount: row[12] || "",
          chequeAmount: row[13] || "",
          chequeNumber: row[14] || "",
          mobileNumber: row[15] || "",
          bankName: row[16] || "",
          itemsJSON: row[17] || "",
          villageName: row[18] || ""
        });
      }
      return formattedData;
    };

    const sheet1Rows = response.data.valueRanges[0].values || [];
    const sheet2Rows = response.data.valueRanges[1].values || [];

    const data1 = formatRows(sheet1Rows, "APMC");
    const data2 = formatRows(sheet2Rows, "Direct");

    let allData = [...data1, ...data2];
    
    allData.sort((a, b) => {
      const numA = parseInt(a.dailyPurchaseId, 10);
      const numB = parseInt(b.dailyPurchaseId, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numB - numA;
      }
      return (b.dailyPurchaseId || '').localeCompare(a.dailyPurchaseId || '');
    });

    if (startDate && endDate) {
      const normStart = normalizeToYMD(startDate);
      const normEnd = normalizeToYMD(endDate);
      allData = allData.filter(e => {
        const entryDateStr = normalizeToYMD(e.date, e.sheetName);
        return entryDateStr && entryDateStr >= normStart && entryDateStr <= normEnd;
      });
    } else if (limit) {
      const numLimit = parseInt(limit, 10);
      if (!isNaN(numLimit) && numLimit > 0) {
        allData = allData.slice(0, numLimit);
      }
    }

    return NextResponse.json({
      success: true,
      source: 'sheets',
      count: allData.length,
      data: allData
    });
  } catch (error) {
    console.error('Google Sheets Read Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
