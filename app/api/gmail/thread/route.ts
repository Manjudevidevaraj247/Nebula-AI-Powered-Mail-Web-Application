import { NextResponse } from "next/server";
import { google } from "googleapis";
import { cookies } from "next/headers";
import { oauth2Client } from "@/lib/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function decodeBody(data?: string | null): string {
  if (!data) {
    return "";
  }

  try {
    return Buffer.from(data, "base64url").toString("utf-8");
  } catch {
    return "";
  }
}

function findPart(
  parts: any[] | undefined,
  mimeType: string
): string {
  if (!parts) {
    return "";
  }

  for (const part of parts) {
    if (
      part.mimeType === mimeType &&
      part.body?.data
    ) {
      return decodeBody(part.body.data);
    }

    const nested = findPart(
      part.parts,
      mimeType
    );

    if (nested) {
      return nested;
    }
  }

  return "";
}

function getHeader(
  headers: any[],
  name: string
): string {
  const header = headers.find(
    (item) =>
      item.name?.toLowerCase() ===
      name.toLowerCase()
  );

  return header?.value || "";
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();

    const refreshToken =
      cookieStore.get(
        "google_refresh_token"
      )?.value;

    if (!refreshToken) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Not authenticated with Google",
        },
        { status: 401 }
      );
    }

    const { searchParams } =
      new URL(request.url);

    const messageId =
      searchParams.get("id");

    if (!messageId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Email ID is required",
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

    // Get the selected Gmail message
    const messageResponse =
      await gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full",
      });

    const message =
      messageResponse.data;

    const threadId =
      message.threadId;

    if (!threadId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Thread ID not found for this email",
        },
        { status: 404 }
      );
    }

    // Get the complete Gmail thread
    const threadResponse =
      await gmail.users.threads.get({
        userId: "me",
        id: threadId,
        format: "full",
      });

    const messages =
      threadResponse.data.messages || [];

    const emails = messages.map(
      (threadMessage) => {
        const payload =
          threadMessage.payload;

        const headers =
          payload?.headers || [];

        let htmlBody = "";
        let textBody = "";

        // Simple HTML email
        if (
          payload?.mimeType ===
          "text/html"
        ) {
          htmlBody = decodeBody(
            payload.body?.data
          );
        }

        // Simple plain-text email
        if (
          payload?.mimeType ===
          "text/plain"
        ) {
          textBody = decodeBody(
            payload.body?.data
          );
        }

        // Multipart email
        if (!htmlBody) {
          htmlBody = findPart(
            payload?.parts,
            "text/html"
          );
        }

        if (!textBody) {
          textBody = findPart(
            payload?.parts,
            "text/plain"
          );
        }

        return {
          id:
            threadMessage.id || "",

          threadId:
            threadMessage.threadId ||
            threadId,

          from: getHeader(
            headers,
            "From"
          ),

          to: getHeader(
            headers,
            "To"
          ),

          subject: getHeader(
            headers,
            "Subject"
          ),

          date: getHeader(
            headers,
            "Date"
          ),

          htmlBody,

          textBody,

          snippet:
            threadMessage.snippet || "",
        };
      }
    );

    return NextResponse.json(
      {
        success: true,
        threadId,
        emails,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(
      "Gmail Thread API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Failed to load Gmail conversation",
      },
      { status: 500 }
    );
  }
}