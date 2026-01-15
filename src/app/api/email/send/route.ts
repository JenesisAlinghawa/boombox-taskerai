/**
 * Email Sending API
 * 
 * POST /api/email/send
 * Body: {
 *   to: string,
 *   subject: string,
 *   template: string,
 *   data: Record<string, any>
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { to, subject, template, data } = await request.json();

    if (!to || !subject || !template) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, template" },
        { status: 400 }
      );
    }

    await sendEmail({
      to,
      subject,
      template,
      data,
    });

    return NextResponse.json({
      message: "Email sent successfully",
    });
  } catch (error) {
    console.error("Error in email API:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
