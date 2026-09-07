import { NextResponse } from "next/server";
import { google } from "googleapis";
import { cookies } from "next/headers";
import { oauth2Client } from "@/lib/google";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();

    const refreshToken =
      cookieStore.get("google_refresh_token")?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Not authenticated with Google" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const to = body.to;
    const subject = body.subject;
    const message = body.message;

    if (!to || !subject || !message) {
      return NextResponse.json(
        {
          error: "To, subject and message are required",
        },
        { status: 400 }
      );
    }

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const gmail = google.gmail({
      version: "v1",
      auth: oauth2Client,
    });

    const emailLines = [
      `To: ${to}`,
      `Subject: ${subject}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      message,
    ];

    const email = emailLines.join("\r\n");

    const encodedEmail = Buffer.from(email).toString("base64url");

    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedEmail,
      },
    });

    return NextResponse.json({
      success: true,
      messageId: response.data.id,
    });
  } catch (error: any) {
    console.error("Gmail Forward error:", error);

    return NextResponse.json(
      {
        error:
          error?.message || "Failed to forward email",
      },
      { status: 500 }
    );
  }
}