import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sql = getDb();
    if (!sql) {
      return NextResponse.json({ success: true, isNeon: false, settings: null });
    }

    await initDb();

    const rows = await sql`SELECT key, value FROM settings`;
    const settingsMap = {};
    for (const r of rows) {
      settingsMap[r.key] = typeof r.value === 'string' ? JSON.parse(r.value) : r.value;
    }

    return NextResponse.json({
      success: true,
      isNeon: true,
      settings: settingsMap
    });
  } catch (err) {
    console.error("Settings GET Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { voucherSettings, chequeSettings } = body;

    const sql = getDb();
    if (!sql) {
      return NextResponse.json({ 
        success: true, 
        isNeon: false, 
        message: "Neon DATABASE_URL not configured. Settings retained in browser localStorage." 
      });
    }

    await initDb();

    if (voucherSettings) {
      await sql`
        INSERT INTO settings (key, value, updated_at)
        VALUES ('voucherSettings', ${JSON.stringify(voucherSettings)}, NOW())
        ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value, updated_at = NOW();
      `;
    }

    if (chequeSettings) {
      await sql`
        INSERT INTO settings (key, value, updated_at)
        VALUES ('chequeSettings', ${JSON.stringify(chequeSettings)}, NOW())
        ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value, updated_at = NOW();
      `;
    }

    return NextResponse.json({ success: true, isNeon: true });
  } catch (err) {
    console.error("Settings POST Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
