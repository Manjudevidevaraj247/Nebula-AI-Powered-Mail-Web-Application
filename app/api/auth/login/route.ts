import { NextResponse } from "next/server";
import { oauth2Client } from "@/lib/google";

export async function GET() {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.send",
    ],
    prompt: "consent",
  });

  return NextResponse.redirect(authUrl);
}