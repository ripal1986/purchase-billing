import { NextResponse } from 'next/server';
import { getDb, initDb, formatDbRow, normalizeToYMD } from '@/lib/db';
import { getGoogleSheetsClient } from '@/lib/googleAuth';

const SPREADSHEET_ID = '1Xsb46eOHnii34YM_UEY3LERAFrggJZMrPzm1vVc8TNw';

export const dynamic = 'force-dynamic';

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

        // Sort by normalized date descending, then dailyPurchaseId descending
        allData.sort((a, b) => {
          const dateA = normalizeToYMD(a.date, a.sheetName, a.dailyPurchaseId) || '';
          const dateB = normalizeToYMD(b.date, b.sheetName, b.dailyPurchaseId) || '';
          if (dateA !== dateB) return dateB.localeCompare(dateA);
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
            const entryDateStr = normalizeToYMD(e.date, e.sheetName, e.dailyPurchaseId);
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
    const sheets = getGoogleSheetsClient(true);

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
        const isShifted = !rawRow[0] && !rawRow[1] && !rawRow[3] && rawRow.length > 19;
        const row = isShifted ? rawRow.slice(18) : rawRow;
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
          finalWeight: row[8] ? String(Math.floor(parseFloat(row[8]) || 0)) : "",
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
