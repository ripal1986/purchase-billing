import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const device = url.searchParams.get('device');
    const status = url.searchParams.get('status') || 'pending';

    const sql = getDb();
    if (!sql) {
      return NextResponse.json({ success: true, jobs: [] });
    }

    await initDb();

    let rows;
    if (device) {
      rows = await sql`
        SELECT id, target_device, job_type, voucher_id, party_name, payload_json, status, created_at, printed_at
        FROM print_jobs
        WHERE target_device = ${device} AND status = ${status}
        ORDER BY id ASC
        LIMIT 10
      `;
    } else {
      rows = await sql`
        SELECT id, target_device, job_type, voucher_id, party_name, payload_json, status, created_at, printed_at
        FROM print_jobs
        ORDER BY id DESC
        LIMIT 25
      `;
    }

    const jobs = rows.map(r => ({
      id: r.id,
      targetDevice: r.target_device,
      jobType: r.job_type,
      voucherId: r.voucher_id,
      partyName: r.party_name,
      payload: typeof r.payload_json === 'string' ? JSON.parse(r.payload_json) : r.payload_json,
      status: r.status,
      createdAt: r.created_at,
      printedAt: r.printed_at
    }));

    return NextResponse.json({ success: true, jobs });
  } catch (err) {
    console.error("PrintJobs GET error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { targetDevice, jobType, voucherId, partyName, payload } = body;

    if (!targetDevice || !payload) {
      return NextResponse.json({ success: false, error: "Missing targetDevice or payload" }, { status: 400 });
    }

    const sql = getDb();
    if (!sql) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    await initDb();

    const result = await sql`
      INSERT INTO print_jobs (target_device, job_type, voucher_id, party_name, payload_json, status)
      VALUES (
        ${targetDevice},
        ${jobType || 'invoice'},
        ${voucherId ? String(voucherId) : ''},
        ${partyName || ''},
        ${JSON.stringify(payload)},
        'pending'
      )
      RETURNING id, target_device, job_type, voucher_id, status;
    `;

    return NextResponse.json({
      success: true,
      job: result[0]
    });
  } catch (err) {
    console.error("PrintJobs POST error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing job id" }, { status: 400 });
    }

    const sql = getDb();
    if (!sql) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    await initDb();

    await sql`
      UPDATE print_jobs
      SET status = ${status || 'printed'}, printed_at = NOW()
      WHERE id = ${parseInt(id, 10)}
    `;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PrintJobs PATCH error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
