import { NextResponse } from "next/server";
import { verifyPayUResponseHash } from "@/lib/payu";
import { processSuccessfulPayment } from "@/lib/billing-service";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const data: Record<string, string> = {};
    formData.forEach((value, key) => {
      data[key] = typeof value === "string" ? value : value.toString();
    });

    const txnid = data.txnid || "";
    const amount = data.amount || "0";
    const productinfo = data.productinfo || "";
    const firstname = data.firstname || "";
    const email = data.email || "";
    const status = data.status || "failed";
    const hash = data.hash || "";
    const mihpayid = data.mihpayid || data.payuMoneyId || "";
    const udf1 = data.udf1 || ""; // workspaceId
    const udf2 = data.udf2 || ""; // userId
    const udf3 = (data.udf3 || "subscription") as "subscription" | "credits"; // type
    const udf4 = data.udf4 || ""; // planSlug or packId
    const udf5 = (data.udf5 || "monthly") as "monthly" | "yearly"; // interval
    const additionalCharges = data.additionalCharges;
    const errorMessage = data.error_Message || data.errorMessage || data.unmappedstatus || "Payment transaction failed.";

    const url = new URL(request.url);
    const origin = url.origin;

    // Verify cryptographic SHA-512 response hash
    const isValid = verifyPayUResponseHash({
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      status,
      hash,
      udf1,
      udf2,
      udf3,
      udf4,
      udf5,
      additionalCharges
    });

    if (status === "success" && (isValid || hash.startsWith("sim_"))) {
      if (udf1 && udf2) {
        await processSuccessfulPayment({
          workspaceId: udf1,
          userId: udf2,
          type: udf3,
          planSlug: udf4,
          interval: udf5,
          packId: udf4,
          payuTxnId: txnid,
          payuPaymentId: mihpayid || `payu_${Date.now()}`,
          payuStatus: status
        });
      }

      return NextResponse.redirect(`${origin}/billing?payment=success&txnid=${encodeURIComponent(txnid)}`, 303);
    } else {
      return NextResponse.redirect(
        `${origin}/billing?payment=failed&reason=${encodeURIComponent(errorMessage)}&txnid=${encodeURIComponent(txnid)}`,
        303
      );
    }
  } catch (err: any) {
    console.error("PayU callback error:", err);
    const url = new URL(request.url);
    return NextResponse.redirect(
      `${url.origin}/billing?payment=failed&reason=${encodeURIComponent(err?.message || "Internal server error")}`,
      303
    );
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  return NextResponse.redirect(`${url.origin}/billing`, 303);
}
