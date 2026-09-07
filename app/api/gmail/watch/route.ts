import { NextResponse } from "next/server";
import { google } from "googleapis";
import { cookies } from "next/headers";
import { oauth2Client } from "@/lib/google";

export async function POST() {
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

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const gmail = google.gmail({
      version: "v1",
      auth: oauth2Client,
    });

    const profile = await gmail.users.getProfile({
      userId: "me",
    });

    const emailAddress = profile.data.emailAddress;

    if (!emailAddress) {
      return NextResponse.json(
        { error: "Gmail address not found" },
        { status: 500 }
      );
    }

    const topicName = process.env.GMAIL_PUBSUB_TOPIC;

    if (!topicName) {
      return NextResponse.json(
        { error: "GMAIL_PUBSUB_TOPIC is not configured" },
        { status: 500 }
      );
    }

    const response = await gmail.users.watch({
      userId: "me",
      requestBody: {
        labelIds: ["INBOX"],
        labelFilterBehavior: "INCLUDE",
        topicName,
      },
    });

    return NextResponse.json({
      success: true,
      emailAddress,
      historyId: response.data.historyId,
      expiration: response.data.expiration,
    });
  } catch (error: any) {
    console.error("Gmail Watch error:", error);

    return NextResponse.json(
      {
        error:
          error?.message || "Failed to start Gmail watch",
      },
      { status: 500 }
    );
  }
}