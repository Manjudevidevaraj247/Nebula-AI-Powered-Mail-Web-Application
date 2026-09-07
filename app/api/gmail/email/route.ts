import { NextResponse } from "next/server";
import { google } from "googleapis";
import { cookies } from "next/headers";
import { oauth2Client } from "@/lib/google";

function decodeBody(data?: string | null) {
  if (!data) return "";
  return Buffer.from(data, "base64url").toString("utf-8");
}

function findPart(
  parts: any[] | undefined,
  mimeType: string
): string {
  if (!parts) return "";

  for (const part of parts) {
    if (part.mimeType === mimeType && part.body?.data) {
      return decodeBody(part.body.data);
    }

    const nested = findPart(part.parts, mimeType);

    if (nested) {
      return nested;
    }
  }

  return "";
}

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Email ID is required" },
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

    const response = await gmail.users.messages.get({
      userId: "me",
      id,
      format: "full",
    });

    const message = response.data;
    const payload = message.payload;

    const headers = payload?.headers || [];

    const getHeader = (name: string) =>
      headers.find(
        (header) =>
          header.name?.toLowerCase() === name.toLowerCase()
      )?.value || "";

    let htmlBody = "";
    let textBody = "";

    if (payload?.mimeType === "text/html") {
      htmlBody = decodeBody(payload.body?.data);
    }

    if (payload?.mimeType === "text/plain") {
      textBody = decodeBody(payload.body?.data);
    }

    if (!htmlBody) {
      htmlBody = findPart(payload?.parts, "text/html");
    }

    if (!textBody) {
      textBody = findPart(payload?.parts, "text/plain");
    }

    const labelIds = message.labelIds || [];

    const isUnread = labelIds.includes("UNREAD");

    if (isUnread) {
      await gmail.users.messages.modify({
        userId: "me",
        id,
        requestBody: {
          removeLabelIds: ["UNREAD"],
        },
      });
    }

    return NextResponse.json({
      id: message.id,
      threadId: message.threadId,
      from: getHeader("From"),
      to: getHeader("To"),
      subject: getHeader("Subject"),
      date: getHeader("Date"),
      htmlBody,
      textBody,
      snippet: message.snippet || "",
      isUnread: false,
    });
  } catch (error: any) {
    console.error("Gmail Email error:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Failed to fetch email",
      },
      { status: 500 }
    );
  }
}