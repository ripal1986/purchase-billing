import { NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/googleAuth';

export async function POST(req) {
  try {
    const { managerUser, managerPass, apmcStart, apmcEnd, directStart, directEnd, bankName, firmName } = await req.json();
    
    if (!managerUser || !managerPass) {
      return NextResponse.json({ success: false, error: 'Username and password required' }, { status: 400 });
    }

    const sheets = getGoogleSheetsClient(false);

    // Store in a safe location in APMC: Columns Z to AG row 1
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID || '1Xsb46eOHnii34YM_UEY3LERAFrggJZMrPzm1vVc8TNw',
      range: 'APMC!Z1:AG1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[managerUser, managerPass, apmcStart, apmcEnd, directStart, directEnd, bankName, firmName]] },
    });

    return NextResponse.json({ success: true, message: 'Manager credentials updated successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
