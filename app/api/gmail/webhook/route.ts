import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("Gmail Pub/Sub notification received:", body);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Webhook error:", error);

    return NextResponse.json(
      {
        error: "Invalid webhook request",
      },
      { status: 400 }
    );
  }
}