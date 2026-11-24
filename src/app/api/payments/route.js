import { NextResponse } from 'next/server';
import { getDb, initDb, formatPaymentRow } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const type = url.searchParams.get('type'); // 'Payment' | 'Receipt' | 'all'

    const sql = getDb();
    if (!sql) {
      return NextResponse.json({ success: true, payments: [] });
    }

    await initDb();

    let rows;
    if (date) {
      rows = await sql`
        SELECT * FROM payments 
        WHERE date = ${date}
        ORDER BY id DESC
      `;
    } else if (startDate && endDate) {
      rows = await sql`
        SELECT * FROM payments 
        WHERE date >= ${startDate} AND date <= ${endDate}
        ORDER BY id DESC
      `;
    } else {
      rows = await sql`
        SELECT * FROM payments 
        ORDER BY id DESC 
        LIMIT 300
      `;
    }

    let payments = rows.map(formatPaymentRow);
    if (type && type !== 'all') {
      payments = payments.filter(p => p.paymentType === type);
    }

    return NextResponse.json({
      success: true,
      payments
    });
  } catch (err) {
    console.error("Payments GET error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      receiptNo,
      paymentType,
      date,
      partyName,
      villageName,
      mobileNumber,
      paymentMode,
      amount,
      chequeNumber,
      chequeDate,
      bankName,
      referenceBillNo,
      remarks,
      updatePurchasePending
    } = body;

    const sql = getDb();
    if (!sql) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    await initDb();

    const amt = parseFloat(amount) || 0;
    const pType = paymentType || 'Payment';
    const mode = paymentMode || 'Cash';

    // Auto-generate receiptNo if empty
    let finalReceiptNo = receiptNo;
    if (!finalReceiptNo || !finalReceiptNo.trim()) {
      const prefix = pType === 'Receipt' ? 'RCP' : 'PAY';
      const countRes = await sql`SELECT COUNT(*) as count FROM payments WHERE payment_type = ${pType}`;
      const nextNum = (parseInt(countRes[0]?.count || 0, 10) + 1).toString().padStart(4, '0');
      finalReceiptNo = `${prefix}-${nextNum}`;
    }

    // Insert payment
    const result = await sql`
      INSERT INTO payments (
        receipt_no, payment_type, date, party_name, village_name,
        mobile_number, payment_mode, amount, cheque_number, cheque_date,
        bank_name, reference_bill_no, remarks
      ) VALUES (
        ${finalReceiptNo},
        ${pType},
        ${date || ''},
        ${partyName || ''},
        ${villageName || ''},
        ${mobileNumber || ''},
        ${mode},
        ${amt},
        ${chequeNumber || ''},
        ${chequeDate || ''},
        ${bankName || ''},
        ${referenceBillNo || ''},
        ${remarks || ''}
      )
      RETURNING *;
    `;

    // If linked to a purchase bill and requested to settle/update
    if (referenceBillNo && updatePurchasePending) {
      try {
        if (mode === 'Cash') {
          await sql`
            UPDATE purchases SET
              cash_amount = COALESCE(cash_amount, 0) + ${amt},
              status = CASE WHEN (COALESCE(cash_amount, 0) + ${amt} + COALESCE(cheque_amount, 0)) >= final_amount THEN 'Completed' ELSE status END
            WHERE voucher_id = ${referenceBillNo}
          `;
        } else if (mode === 'Cheque') {
          await sql`
            UPDATE purchases SET
              cheque_amount = COALESCE(cheque_amount, 0) + ${amt},
              cheque_number = COALESCE(NULLIF(${chequeNumber || ''}, ''), cheque_number),
              cheque_date = COALESCE(NULLIF(${chequeDate || ''}, ''), cheque_date),
              bank_name = COALESCE(NULLIF(${bankName || ''}, ''), bank_name),
              status = CASE WHEN (COALESCE(cash_amount, 0) + COALESCE(cheque_amount, 0) + ${amt}) >= final_amount THEN 'Completed' ELSE status END
            WHERE voucher_id = ${referenceBillNo}
          `;
        }
      } catch (upErr) {
        console.error("Failed to update linked purchase:", upErr);
      }
    }

    return NextResponse.json({
      success: true,
      payment: formatPaymentRow(result[0])
    });
  } catch (err) {
    console.error("Payments POST error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing ID" }, { status: 400 });
    }

    const sql = getDb();
    if (!sql) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    await initDb();
    await sql`DELETE FROM payments WHERE id = ${parseInt(id, 10)}`;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Payments DELETE error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
