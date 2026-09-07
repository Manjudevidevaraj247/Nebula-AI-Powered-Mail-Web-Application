import { NextResponse } from "next/server";
import { oauth2Client } from "@/lib/google";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.json(
      { error: "Google authorization was denied." },
      { status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json(
      { error: "Authorization code is missing." },
      { status: 400 }
    );
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return NextResponse.json(
        { error: "Refresh token was not received from Google." },
        { status: 500 }
      );
    }

    const response = NextResponse.redirect(
      new URL("/", request.url)
    );

    response.cookies.set("google_refresh_token", tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    response.cookies.set("google_authenticated", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    console.error("OAuth error:", error);

    return NextResponse.json(
      { error: "Failed to exchange authorization code." },
      { status: 500 }
    );
  }
}