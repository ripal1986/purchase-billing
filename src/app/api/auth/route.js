import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { getGoogleSheetsClient } from '@/lib/googleAuth';

export async function POST(req) {
  try {
    const { username, password } = await req.json();
    
    // Admin Credentials
    const adminUser = 'Ripal1986';
    const adminPass = 'Mo@9898838724';
    
    // Default Manager Credentials
    let helperUser = process.env.HELPER_USERNAME || 'manager';
    let helperPass = process.env.HELPER_PASSWORD || 'manager123';
    
    let settings = {};

    // 1. Try Neon Postgres
    const sql = getDb();
    if (sql) {
      try {
        await initDb();
        const rows = await sql`SELECT key, value FROM settings WHERE key = 'voucherSettings'`;
        if (rows && rows.length > 0) {
          const vs = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
          if (vs.managerUsername) helperUser = vs.managerUsername;
          if (vs.managerPassword) helperPass = vs.managerPassword;
          settings = vs;
        }
      } catch (dbErr) {
        console.error('Error reading auth from Neon:', dbErr.message);
      }
    }

    // 2. If not found in Neon, check Google Sheets fallback
    if (!settings.firmName) {
      try {
        const sheets = getGoogleSheetsClient(true);
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: process.env.GOOGLE_SHEET_ID || '1Xsb46eOHnii34YM_UEY3LERAFrggJZMrPzm1vVc8TNw',
          range: 'APMC!Z1:AG1',
        });
        if (response.data.values && response.data.values[0]) {
          const row = response.data.values[0];
          if (row[0]) helperUser = row[0];
          if (row[1]) helperPass = row[1];
          if (row[2]) settings.apmcStart = row[2];
          if (row[3]) settings.apmcEnd = row[3];
          if (row[4]) settings.directStart = row[4];
          if (row[5]) settings.directEnd = row[5];
          if (row[6]) settings.bankName = row[6];
          if (row[7]) settings.firmName = row[7];
        }
      } catch (e) {
        console.error('Error reading credentials from Google Sheets', e.message);
      }
    }

    if (username === adminUser && password === adminPass) {
      return NextResponse.json({ success: true, role: 'admin', settings });
    }
    
    if (username === helperUser && password === helperPass) {
      return NextResponse.json({ success: true, role: 'helper', settings });
    }

    return NextResponse.json({ success: false, error: 'ખોટો યુઝરનેમ અથવા પાસવર્ડ!' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
