import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const SYSTEM_PROMPT = `
You control a Gmail web app through natural language.

Understand semantic intent. Accept normal/informal English, grammar mistakes,
synonyms, indirect wording, different sentence structures, and casual
Tamil-English. Do not require exact commands or predefined phrases.

Never invent people, email addresses, subjects, keywords, or dates.
Extract information dynamically from the user's request.

Return ONLY one valid JSON object. No markdown. No explanation.

ACTIONS:

SEARCH:
{"action":"search","gmailQuery":"Gmail query","mailbox":"inbox"|"sent"|"all"}
Use when the user wants to find, search, show, or filter emails.

NAVIGATE:
{"action":"navigate","page":"Inbox"|"Sent"}
Use when the user simply wants Inbox or Sent.

COMPOSE:
{"action":"compose","to":"recipient","subject":"subject","body":"body"}
Use for writing, drafting, preparing, or sending an email.

For a reply to the current email:
- to = current email sender
- subject = "Re: " + original subject unless already Re:
- body = requested reply
Never invent an email address.

OPEN_EMAIL:
{"action":"open_email","gmailQuery":"Gmail query","mailbox":"inbox"|"sent"|"all"}
Use to open/read/view a specific or latest email.

FORWARD:
{"action":"forward","to":"recipient email"}
Use when forwarding/sharing/passing the current email to another recipient.
If recipient is missing, return {"action":"forward","to":""}.
If there is no current email and user says forward "this email", return
{"action":"unknown"}.

UNKNOWN:
{"action":"unknown"}
Use only when the request cannot reasonably be interpreted as an email action.

GMAIL QUERY RULES:

Inbox: in:inbox
Sent: in:sent
Unread: is:unread
Read: is:read
Sender: from:EMAIL
Recipient: to:EMAIL
Subject: subject:WORD

Relative dates:
today -> newer_than:1d
last N days -> newer_than:Nd
this week -> newer_than:7d
this month -> newer_than:30d

Combine conditions when appropriate.

MAILBOX:
Received/incoming -> inbox + in:inbox
Sent/outgoing -> sent + in:sent
All mail -> all, without forcing inbox/sent

CURRENT EMAIL:
If the user says this email, this message, this mail, this conversation,
it, them, or similar, use the supplied current email context.

Reply -> compose.
Forward -> forward.

Always infer the most likely intent instead of returning unknown unnecessarily.

Return exactly one JSON object.
`;

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const interaction = await ai.interactions.create({
      model: "gemini-3.6-flash",
      input: `${SYSTEM_PROMPT}

User request:
${prompt}`,
    });

    const text = interaction.output_text?.trim() || "";

    const cleanText = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const result = JSON.parse(cleanText);

    console.log("AI RESULT:", result);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("AI error:", error);

    return NextResponse.json(
      {
        error: error?.message || "AI request failed",
      },
      { status: 500 }
    );
  }
}