import { NextResponse } from "next/server";
import { google } from "googleapis";
import { cookies } from "next/headers";
import { oauth2Client } from "@/lib/google";

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
    const query = searchParams.get("q") || "";

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const gmail = google.gmail({
      version: "v1",
      auth: oauth2Client,
    });

    const response = await gmail.users.messages.list({
      userId: "me",
      maxResults: 20,
      labelIds: ["SENT"],
      q: query,
    });

    const messages = response.data.messages || [];

    const emails = await Promise.all(
      messages.map(async (message) => {
        if (!message.id) return null;

        const email = await gmail.users.messages.get({
          userId: "me",
          id: message.id,
          format: "metadata",
          metadataHeaders: ["From", "To", "Subject", "Date"],
        });

        const headers = email.data.payload?.headers || [];

        const getHeader = (name: string) =>
          headers.find(
            (header) =>
              header.name?.toLowerCase() === name.toLowerCase()
          )?.value || "";

        return {
          id: message.id,
          from: getHeader("From"),
          to: getHeader("To"),
          subject: getHeader("Subject"),
          date: getHeader("Date"),
          snippet: email.data.snippet || "",
        };
      })
    );

    return NextResponse.json({
      emails: emails.filter(Boolean),
    });
  } catch (error: any) {
    console.error("Gmail Sent error:", error);

    return NextResponse.json(
      {
        error:
          error?.message || "Failed to fetch sent emails",
      },
      { status: 500 }
    );
  }
}