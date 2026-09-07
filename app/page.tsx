"use client";

import { useEffect, useState } from "react";

type AIAction =
  | {
      action: "search";
      gmailQuery: string;
      mailbox?: "inbox" | "sent" | "all";
    }
  | {
      action: "navigate";
      page: "Inbox" | "Sent";
    }
  | {
      action: "compose";
      to?: string;
      subject?: string;
      body?: string;
    }
  | {
      action: "open_email";
      gmailQuery: string;
      mailbox?: "inbox" | "sent" | "all";
    }
  | {
      action: "forward";
      to?: string;
    }
  | {
      action: "unknown";
    };

export default function Home() {
  const [activePage, setActivePage] = useState("Inbox");
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  const [threadEmails, setThreadEmails] = useState<any[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState("");

  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState("");

  const [aiCommand, setAiCommand] = useState("");
  const [aiStatus, setAiStatus] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [sender, setSender] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [readFilter, setReadFilter] = useState("all");

  const [currentQuery, setCurrentQuery] = useState("");
  const [aiPreviewEmails, setAiPreviewEmails] = useState<any[]>([]);

  const [darkMode, setDarkMode] = useState(false);

  const theme = {
    background: darkMode ? "#0f172a" : "#f5f7fb",
    surface: darkMode ? "#111827" : "#ffffff",
    soft: darkMode ? "#1e293b" : "#f8fafc",
    border: darkMode ? "#334155" : "#e5e7eb",
    text: darkMode ? "#f8fafc" : "#111827",
    muted: darkMode ? "#94a3b8" : "#64748b",
    primary: "#2563eb",
    primarySoft: darkMode ? "#172554" : "#eff6ff",
  };

  function handleGoogleLogin() {
    window.location.href = "/api/auth/login";
  }

  useEffect(() => {
    if (activePage === "Inbox") {
      loadInbox(currentQuery);
    }

    if (activePage === "Sent") {
      loadSent(currentQuery);
    }
  }, [activePage]);

  useEffect(() => {
    async function startGmailWatch() {
      try {
        const response = await fetch("/api/gmail/watch", {
          method: "POST",
        });

        const text = await response.text();

        let data: any = {};

        try {
          data = JSON.parse(text);
        } catch {
          data = {};
        }

        if (!response.ok) {
          console.error("Gmail watch failed:", data);
          return;
        }

        console.log("Gmail watch started:", data);
      } catch (error) {
        console.error("Gmail watch error:", error);
      }
    }

    startGmailWatch();
  }, []);

  useEffect(() => {
    if (activePage !== "Inbox" && activePage !== "Sent") {
      return;
    }

    const interval = setInterval(() => {
      if (activePage === "Inbox" && !selectedEmail) {
        loadInbox(currentQuery);
      }

      if (activePage === "Sent" && !selectedEmail) {
        loadSent(currentQuery);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [activePage, selectedEmail, currentQuery]);

  async function loadInbox(query = "") {
    setLoading(true);

    try {
      const url = query
        ? `/api/gmail/inbox?q=${encodeURIComponent(query)}`
        : "/api/gmail/inbox";

      const response = await fetch(url);
      const text = await response.text();

      let data: any = {};

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Inbox returned an invalid response.");
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to load inbox");
      }

      setEmails(data.emails || []);
    } catch (error) {
      console.error("Inbox error:", error);
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadSent(query = "") {
    setLoading(true);

    try {
      const url = query
        ? `/api/gmail/sent?q=${encodeURIComponent(query)}`
        : "/api/gmail/sent";

      const response = await fetch(url);
      const text = await response.text();

      let data: any = {};

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Sent returned an invalid response.");
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to load sent emails");
      }

      setEmails(data.emails || []);
    } catch (error) {
      console.error("Sent error:", error);
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadThread(
    messageId: string,
    fallbackEmail: any = null
  ) {
    if (!messageId) {
      setThreadEmails([]);
      setThreadError("Email ID is missing.");
      return;
    }

    setThreadLoading(true);
    setThreadError("");

    try {
      const response = await fetch(
        `/api/gmail/thread?id=${encodeURIComponent(messageId)}`,
        {
          cache: "no-store",
        }
      );

      const text = await response.text();

      let data: any = null;

      try {
        data = JSON.parse(text);
      } catch {
        console.error(
          "Thread API returned non-JSON response:",
          text.slice(0, 300)
        );

        if (fallbackEmail) {
          setThreadEmails([fallbackEmail]);
          setThreadError(
            "Full conversation could not be loaded. Showing this email."
          );
        } else {
          setThreadEmails([]);
          setThreadError(
            "Conversation thread could not be loaded."
          );
        }

        return;
      }

      if (!response.ok) {
        console.error("Thread API error:", data);

        if (fallbackEmail) {
          setThreadEmails([fallbackEmail]);
          setThreadError(
            "Full conversation could not be loaded. Showing this email."
          );
        } else {
          setThreadEmails([]);
          setThreadError(
            data?.error ||
              "Conversation thread could not be loaded."
          );
        }

        return;
      }

      if (
        data &&
        Array.isArray(data.emails) &&
        data.emails.length > 0
      ) {
        setThreadEmails(data.emails);
        setThreadError("");
        return;
      }

      if (fallbackEmail) {
        setThreadEmails([fallbackEmail]);
        setThreadError(
          "This email has no additional conversation messages."
        );
      } else {
        setThreadEmails([]);
        setThreadError(
          "No conversation messages were found."
        );
      }
    } catch (error) {
      console.error("Thread error:", error);

      if (fallbackEmail) {
        setThreadEmails([fallbackEmail]);
        setThreadError(
          "Full conversation could not be loaded. Showing this email."
        );
      } else {
        setThreadEmails([]);
        setThreadError(
          "Conversation thread could not be loaded."
        );
      }
    } finally {
      setThreadLoading(false);
    }
  }

  async function openEmail(id: string) {
    setEmailLoading(true);
    setThreadEmails([]);
    setThreadError("");

    try {
      const response = await fetch(
        `/api/gmail/email?id=${encodeURIComponent(id)}`,
        {
          cache: "no-store",
        }
      );

      const text = await response.text();

      let data: any = {};

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          "Email API returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to open email"
        );
      }

      setSelectedEmail(data);

      await loadThread(id, data);
    } catch (error) {
      console.error("Open email error:", error);
    } finally {
      setEmailLoading(false);
    }
  }

  async function openEmailFromAI(
    query: string,
    mailbox: "inbox" | "sent" | "all" = "inbox"
  ) {
    setLoading(true);

    try {
      let response;

      if (mailbox === "sent") {
        response = await fetch(
          `/api/gmail/sent?q=${encodeURIComponent(query)}`
        );
      } else {
        response = await fetch(
          `/api/gmail/inbox?q=${encodeURIComponent(query)}`
        );
      }

      const text = await response.text();

      let data: any = {};

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          "Search returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to find email"
        );
      }

      const results = data.emails || [];

      if (results.length === 0) {
        setAiPreviewEmails([]);
        setAiStatus(
          "I couldn't find a matching email."
        );
        return;
      }

      setCurrentQuery(query);
      setAiPreviewEmails(results.slice(0, 5));
      setActivePage(
        mailbox === "sent" ? "Sent" : "Inbox"
      );

      await openEmail(results[0].id);

      setAiStatus("Matching email opened.");
    } catch (error) {
      console.error("AI open email error:", error);
      setAiStatus("I couldn't open that email.");
    } finally {
      setLoading(false);
    }
  }

  async function sendEmail() {
    if (
      !to.trim() ||
      !subject.trim() ||
      !message.trim()
    ) {
      setSendStatus("Please complete all fields.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to send this email?\n\nTo: ${to.trim()}\nSubject: ${subject.trim()}`
    );

    if (!confirmed) {
      setSendStatus("Email sending cancelled.");
      return;
    }

    setSending(true);
    setSendStatus("");

    try {
      const response = await fetch("/api/gmail/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: to.trim(),
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      const text = await response.text();

      let data: any = {};

      try {
        data = JSON.parse(text);
      } catch {
        setSendStatus(
          "Server returned an invalid response."
        );
        return;
      }

      if (!response.ok) {
        setSendStatus(
          data.error || "Failed to send email."
        );
        return;
      }

      setSendStatus("Email sent successfully.");

      setTo("");
      setSubject("");
      setMessage("");
    } catch (error) {
      console.error("Send email error:", error);
      setSendStatus("Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  function prepareReply() {
    if (!selectedEmail) {
      return;
    }

    const replySubject = selectedEmail.subject || "";

    setTo(selectedEmail.from || "");

    setSubject(
      replySubject.toLowerCase().startsWith("re:")
        ? replySubject
        : `Re: ${replySubject}`
    );

    setMessage("");

    setSelectedEmail(null);
    setThreadEmails([]);
    setThreadError("");
    setActivePage("Compose");
    setSendStatus("");

    setAiStatus(
      "Reply prepared. Review the message and click Send."
    );
  }

  function prepareForward(recipient = "") {
    if (!selectedEmail) {
      setAiStatus("Please open an email first.");
      return;
    }

    const originalBody =
      selectedEmail.textBody ||
      selectedEmail.snippet ||
      "";

    const forwardedBody = [
      "---------- Forwarded message ----------",
      `From: ${selectedEmail.from || ""}`,
      `Date: ${selectedEmail.date || ""}`,
      `Subject: ${selectedEmail.subject || ""}`,
      `To: ${selectedEmail.to || ""}`,
      "",
      originalBody,
    ].join("\n");

    const originalSubject =
      selectedEmail.subject || "";

    setTo(recipient);

    setSubject(
      originalSubject.toLowerCase().startsWith("fwd:")
        ? originalSubject
        : `Fwd: ${originalSubject}`
    );

    setMessage(forwardedBody);

    setSelectedEmail(null);
    setThreadEmails([]);
    setThreadError("");
    setActivePage("Compose");
    setSendStatus("");

    if (recipient) {
      setAiStatus(
        "Forward prepared. Review the message and click Send."
      );
    } else {
      setAiStatus(
        "Forward prepared. Enter the recipient and click Send."
      );
    }
  }

  function detectFastAction(
    command: string
  ): AIAction | null {
    const text = command.toLowerCase().trim();

    if (
      /^(inbox|open inbox|show inbox|go to inbox|take me to inbox|check inbox|view inbox)$/.test(
        text
      )
    ) {
      return {
        action: "navigate",
        page: "Inbox",
      };
    }

    if (
      /^(sent|open sent|show sent|go to sent|take me to sent|check sent|view sent)$/.test(
        text
      )
    ) {
      return {
        action: "navigate",
        page: "Sent",
      };
    }

    if (
      /^(compose|compose email|new email|new mail|write email|write a mail)$/.test(
        text
      )
    ) {
      return {
        action: "compose",
        to: "",
        subject: "",
        body: "",
      };
    }

    return null;
  }

  function detectNavigation(
    command: string
  ): AIAction | null {
    const text = command.toLowerCase().trim();

    const sentWords = [
      "sent",
      "outgoing",
      "i sent",
      "i have sent",
      "i've sent",
      "what i sent",
      "messages i sent",
      "emails i sent",
      "mail i sent",
      "emails i wrote",
      "messages i wrote",
      "mail i wrote",
      "things i mailed",
    ];

    const inboxWords = [
      "inbox",
      "received",
      "incoming",
      "what i received",
      "emails i received",
      "messages i received",
      "mail i received",
    ];

    const navigationWords = [
      "show",
      "open",
      "view",
      "see",
      "check",
      "take me",
      "go to",
      "let me see",
      "i want to see",
      "i need to see",
      "bring me",
      "display",
    ];

    const hasNavigationIntent =
      navigationWords.some((word) =>
        text.includes(word)
      );

    const wantsSent = sentWords.some((word) =>
      text.includes(word)
    );

    const wantsInbox = inboxWords.some((word) =>
      text.includes(word)
    );

    if (hasNavigationIntent && wantsSent) {
      return {
        action: "navigate",
        page: "Sent",
      };
    }

    if (hasNavigationIntent && wantsInbox) {
      return {
        action: "navigate",
        page: "Inbox",
      };
    }

    return null;
  }

  async function handleAICommand() {
    const command = aiCommand.trim();

    if (!command || aiLoading) {
      return;
    }

    const fastAction = detectFastAction(command);

    if (fastAction) {
      await executeAIAction(fastAction);
      setAiCommand("");
      return;
    }

    setAiLoading(true);
    setAiStatus("AI is thinking...");

    try {
      const currentEmailContext = selectedEmail
        ? `
Currently opened email:
From: ${selectedEmail.from || ""}
To: ${selectedEmail.to || ""}
Subject: ${selectedEmail.subject || ""}
Date: ${selectedEmail.date || ""}
Body:
${selectedEmail.textBody || selectedEmail.snippet || ""}
`
        : "No email is currently open.";

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: `${command}

${currentEmailContext}`,
        }),
      });

      const text = await response.text();

      let data: AIAction | { error?: string };

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          "AI returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          "error" in data
            ? data.error || "AI request failed"
            : "AI request failed"
        );
      }

      const aiAction = data as AIAction;

      if (aiAction.action === "unknown") {
        const fallbackAction =
          detectNavigation(command);

        if (fallbackAction) {
          await executeAIAction(fallbackAction);
        } else {
          setAiStatus(
            "I couldn't understand the request. Try describing what you want to do with your mail."
          );
        }
      } else {
        await executeAIAction(aiAction);
      }

      setAiCommand("");
    } catch (error) {
      console.error("AI error:", error);

      const fallbackAction =
        detectNavigation(command);

      if (fallbackAction) {
        await executeAIAction(fallbackAction);
        setAiCommand("");
      } else {
        setAiStatus(
          "AI couldn't understand that request."
        );
      }
    } finally {
      setAiLoading(false);
    }
  }

  async function executeAIAction(
    action: AIAction
  ) {
    if (action.action === "navigate") {
      setSelectedEmail(null);
      setThreadEmails([]);
      setThreadError("");
      setAiPreviewEmails([]);

      setCurrentQuery("");

      setKeyword("");
      setSender("");
      setDateFilter("all");
      setReadFilter("all");

      setActivePage(action.page);

      setAiStatus(
        action.page === "Inbox"
          ? "Inbox opened."
          : "Sent opened."
      );

      return;
    }

    if (action.action === "compose") {
      setSelectedEmail(null);
      setThreadEmails([]);
      setThreadError("");
      setAiPreviewEmails([]);

      setActivePage("Compose");

      setTo(action.to || "");
      setSubject(action.subject || "");
      setMessage(action.body || "");

      setSendStatus("");

      setAiStatus(
        "Compose form prepared by AI. Review and click Send."
      );

      return;
    }

    if (action.action === "forward") {
      prepareForward(action.to || "");
      return;
    }

    if (action.action === "search") {
      setSelectedEmail(null);
      setThreadEmails([]);
      setThreadError("");

      const mailbox = action.mailbox || "inbox";
      const query = action.gmailQuery || "";

      setCurrentQuery(query);

      if (mailbox === "sent") {
        setActivePage("Sent");

        const response = await fetch(
          `/api/gmail/sent?q=${encodeURIComponent(query)}`
        );

        const text = await response.text();

        let data: any = {};

        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(
            "Sent search returned invalid response."
          );
        }

        const results = data.emails || [];

        setAiPreviewEmails(
          results.slice(0, 5)
        );
        setEmails(results);

        setAiStatus(
          "Showing matching sent emails."
        );
      } else {
        setActivePage("Inbox");

        const response = await fetch(
          `/api/gmail/inbox?q=${encodeURIComponent(query)}`
        );

        const text = await response.text();

        let data: any = {};

        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(
            "Inbox search returned invalid response."
          );
        }

        const results = data.emails || [];

        setAiPreviewEmails(
          results.slice(0, 5)
        );
        setEmails(results);

        setAiStatus(
          "Showing matching emails."
        );
      }

      return;
    }

    if (action.action === "open_email") {
      setSelectedEmail(null);
      setThreadEmails([]);
      setThreadError("");

      await openEmailFromAI(
        action.gmailQuery,
        action.mailbox || "inbox"
      );

      return;
    }

    if (action.action === "unknown") {
      setAiStatus(
        "I couldn't understand the request. Try describing what you want to do with your mail."
      );
    }
  }

  function applyFilters() {
    const queryParts: string[] = [];

    if (keyword.trim()) {
      queryParts.push(keyword.trim());
    }

    if (sender.trim()) {
      queryParts.push(
        `from:${sender.trim()}`
      );
    }

    if (dateFilter !== "all") {
      queryParts.push(
        `newer_than:${dateFilter}`
      );
    }

    if (readFilter === "unread") {
      queryParts.push("is:unread");
    }

    if (readFilter === "read") {
      queryParts.push("is:read");
    }

    const query = queryParts.join(" ");

    setCurrentQuery(query);
    setAiPreviewEmails([]);

    if (activePage === "Inbox") {
      loadInbox(query);
    }

    if (activePage === "Sent") {
      loadSent(query);
    }
  }

  function clearFilters() {
    setKeyword("");
    setSender("");
    setDateFilter("all");
    setReadFilter("all");
    setCurrentQuery("");
    setAiPreviewEmails([]);

    if (activePage === "Inbox") {
      loadInbox();
    }

    if (activePage === "Sent") {
      loadSent();
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        background: theme.background,
        color: theme.text,
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      }}
    >
      <aside
        style={{
          width: "235px",
          background: theme.surface,
          borderRight:
            `1px solid ${theme.border}`,
          padding: "28px 18px",
          boxSizing: "border-box",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              color: theme.primary,
              fontSize: "12px",
              fontWeight: "800",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: "5px",
            }}
          >
            NEBULA
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: "23px",
              letterSpacing: "-0.04em",
            }}
          >
            Mail
          </h2>
        </div>

        {/* GOOGLE LOGIN BUTTON */}
        <button
          onClick={handleGoogleLogin}
          style={{
            width: "100%",
            padding: "12px 14px",
            marginBottom: "12px",
            border: `1px solid ${theme.border}`,
            borderRadius: "9px",
            background: theme.surface,
            color: theme.text,
            cursor: "pointer",
            fontWeight: "700",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "9px",
          }}
        >
          <span
            style={{
              fontSize: "17px",
              fontWeight: "800",
            }}
          >
            G
          </span>
          Continue with Google
        </button>

        <button
          onClick={() =>
            setDarkMode((current) => !current)
          }
          style={{
            width: "100%",
            padding: "11px 14px",
            marginBottom: "24px",
            border:
              `1px solid ${theme.border}`,
            borderRadius: "9px",
            background: theme.soft,
            color: theme.text,
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "13px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>
            {darkMode ? "Light mode" : "Dark mode"}
          </span>

          <span style={{ fontSize: "17px" }}>
            {darkMode ? "☀" : "☾"}
          </span>
        </button>

        <div
          style={{
            fontSize: "11px",
            fontWeight: "700",
            color: theme.muted,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            margin: "0 10px 8px",
          }}
        >
          Mailbox
        </div>

        <button
          onClick={() => {
            setCurrentQuery("");
            setKeyword("");
            setSender("");
            setDateFilter("all");
            setReadFilter("all");
            setAiPreviewEmails([]);
            setThreadEmails([]);
            setThreadError("");
            setActivePage("Inbox");
            setSelectedEmail(null);
          }}
          style={{
            ...navButtonStyle,
            background:
              activePage === "Inbox"
                ? theme.primarySoft
                : "transparent",
            color:
              activePage === "Inbox"
                ? theme.primary
                : theme.text,
            fontWeight:
              activePage === "Inbox"
                ? "700"
                : "500",
          }}
        >
          <span>Inbox</span>
          <span>›</span>
        </button>

        <button
          onClick={() => {
            setCurrentQuery("");
            setKeyword("");
            setSender("");
            setDateFilter("all");
            setReadFilter("all");
            setAiPreviewEmails([]);
            setThreadEmails([]);
            setThreadError("");
            setActivePage("Sent");
            setSelectedEmail(null);
          }}
          style={{
            ...navButtonStyle,
            background:
              activePage === "Sent"
                ? theme.primarySoft
                : "transparent",
            color:
              activePage === "Sent"
                ? theme.primary
                : theme.text,
            fontWeight:
              activePage === "Sent"
                ? "700"
                : "500",
          }}
        >
          <span>Sent</span>
          <span>›</span>
        </button>

        <button
          onClick={() => {
            setActivePage("Compose");
            setSelectedEmail(null);
            setThreadEmails([]);
            setThreadError("");
            setAiPreviewEmails([]);
            setSendStatus("");
          }}
          style={{
            width: "100%",
            padding: "13px 16px",
            marginTop: "18px",
            border: "none",
            borderRadius: "9px",
            background: theme.primary,
            color: "white",
            cursor: "pointer",
            fontWeight: "700",
            fontSize: "14px",
            boxShadow:
              "0 5px 14px rgba(37,99,235,0.22)",
          }}
        >
          + Compose
        </button>

        <div style={{ flex: 1 }} />

        <div
          style={{
            borderTop:
              `1px solid ${theme.border}`,
            paddingTop: "15px",
            color: theme.muted,
            fontSize: "11px",
            lineHeight: "1.5",
          }}
        >
          Gmail connected
          <br />
          AI Mail Copilot enabled
        </div>
      </aside>

      <section
        style={{
          flex: 1,
          minWidth: 0,
          padding: "30px",
          overflowY: "auto",
        }}
      >
        {selectedEmail ? (
          <div>
            <button
              onClick={() => {
                setSelectedEmail(null);
                setThreadEmails([]);
                setThreadError("");
              }}
              style={{
                ...backButtonStyle,
                background: theme.surface,
                color: theme.text,
                borderColor: theme.border,
              }}
            >
              ← Back to {activePage}
            </button>

            {emailLoading ? (
              <LoadingCard theme={theme} />
            ) : (
              <>
                <div
                  style={{
                    background: theme.surface,
                    border:
                      `1px solid ${theme.border}`,
                    borderRadius: "14px",
                    padding: "32px",
                    boxShadow:
                      "0 8px 30px rgba(15,23,42,0.05)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      color: theme.primary,
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: "8px",
                    }}
                  >
                    Email detail
                  </div>

                  <h1
                    style={{
                      margin: 0,
                      fontSize: "28px",
                      letterSpacing: "-0.04em",
                    }}
                  >
                    {selectedEmail.subject ||
                      "(No subject)"}
                  </h1>

                  <div
                    style={{
                      marginTop: "22px",
                      padding: "16px",
                      borderRadius: "10px",
                      background: theme.soft,
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 7px",
                      }}
                    >
                      <strong>From:</strong>{" "}
                      {selectedEmail.from}
                    </p>

                    <p
                      style={{
                        margin: "0 0 7px",
                      }}
                    >
                      <strong>To:</strong>{" "}
                      {selectedEmail.to}
                    </p>

                    <p
                      style={{
                        margin: 0,
                        color: theme.muted,
                        fontSize: "13px",
                      }}
                    >
                      {selectedEmail.date}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      marginTop: "20px",
                    }}
                  >
                    <button
                      onClick={prepareReply}
                      style={{
                        ...secondaryButtonStyle,
                        background: theme.surface,
                        color: theme.text,
                        borderColor: theme.border,
                      }}
                    >
                      Reply
                    </button>

                    <button
                      onClick={() =>
                        prepareForward()
                      }
                      style={{
                        ...secondaryButtonStyle,
                        background: theme.surface,
                        color: theme.text,
                        borderColor: theme.border,
                      }}
                    >
                      Forward
                    </button>
                  </div>

                  <hr
                    style={{
                      margin: "25px 0",
                      border: 0,
                      borderTop:
                        `1px solid ${theme.border}`,
                    }}
                  />

                  {selectedEmail.htmlBody ? (
                    <iframe
                      title="Email content"
                      srcDoc={
                        selectedEmail.htmlBody
                      }
                      sandbox=""
                      style={{
                        width: "100%",
                        minHeight: "600px",
                        border: "none",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        whiteSpace: "pre-wrap",
                        lineHeight: "1.7",
                      }}
                    >
                      {selectedEmail.textBody ||
                        selectedEmail.snippet}
                    </div>
                  )}
                </div>

                {threadLoading && (
                  <div
                    style={{
                      marginTop: "20px",
                      background: theme.surface,
                      border:
                        `1px solid ${theme.border}`,
                      borderRadius: "14px",
                      padding: "22px",
                      color: theme.muted,
                      textAlign: "center",
                    }}
                  >
                    Loading conversation thread...
                  </div>
                )}

                {!threadLoading &&
                  threadError && (
                    <div
                      style={{
                        marginTop: "20px",
                        background: theme.surface,
                        border:
                          `1px solid ${theme.border}`,
                        borderRadius: "14px",
                        padding: "15px 18px",
                        color: theme.muted,
                        fontSize: "12px",
                      }}
                    >
                      {threadError}
                    </div>
                  )}

                {!threadLoading &&
                  threadEmails.length > 0 && (
                    <div
                      style={{
                        marginTop: "20px",
                        background: theme.surface,
                        border:
                          `1px solid ${theme.border}`,
                        borderRadius: "14px",
                        padding: "24px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent:
                            "space-between",
                          marginBottom: "16px",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              color: theme.primary,
                              fontSize: "11px",
                              fontWeight: "800",
                              textTransform:
                                "uppercase",
                              letterSpacing:
                                "0.08em",
                              marginBottom: "6px",
                            }}
                          >
                            Conversation Thread
                          </div>

                          <h3
                            style={{
                              margin: 0,
                              fontSize: "19px",
                            }}
                          >
                            {threadEmails.length}{" "}
                            {threadEmails.length === 1
                              ? "message"
                              : "messages"}
                          </h3>
                        </div>

                        <div
                          style={{
                            padding: "7px 11px",
                            borderRadius: "20px",
                            background:
                              theme.primarySoft,
                            color: theme.primary,
                            fontSize: "11px",
                            fontWeight: "800",
                          }}
                        >
                          THREAD
                        </div>
                      </div>

                      {threadEmails.map(
                        (
                          threadEmail,
                          index
                        ) => (
                          <div
                            key={
                              threadEmail.id ||
                              `${index}-${threadEmail.date}`
                            }
                            style={{
                              border:
                                `1px solid ${theme.border}`,
                              borderRadius: "12px",
                              padding: "17px",
                              marginBottom:
                                index ===
                                threadEmails.length -
                                  1
                                  ? 0
                                  : "10px",
                              background:
                                threadEmail.id ===
                                selectedEmail.id
                                  ? theme.primarySoft
                                  : theme.soft,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent:
                                  "space-between",
                                gap: "15px",
                              }}
                            >
                              <div
                                style={{
                                  minWidth: 0,
                                  flex: 1,
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: "11px",
                                    color:
                                      theme.primary,
                                    fontWeight: "800",
                                    textTransform:
                                      "uppercase",
                                    letterSpacing:
                                      "0.06em",
                                    marginBottom:
                                      "7px",
                                  }}
                                >
                                  Message{" "}
                                  {index + 1}
                                </div>

                                <div
                                  style={{
                                    fontWeight: "700",
                                    fontSize: "13px",
                                    marginBottom:
                                      "5px",
                                  }}
                                >
                                  {threadEmail.from ||
                                    "Unknown sender"}
                                </div>

                                <div
                                  style={{
                                    fontSize: "12px",
                                    color:
                                      theme.muted,
                                  }}
                                >
                                  To:{" "}
                                  {threadEmail.to ||
                                    "Unknown recipient"}
                                </div>
                              </div>

                              <div
                                style={{
                                  color:
                                    theme.muted,
                                  fontSize: "10px",
                                  whiteSpace:
                                    "nowrap",
                                }}
                              >
                                {threadEmail.date}
                              </div>
                            </div>

                            <div
                              style={{
                                marginTop: "13px",
                                paddingTop: "13px",
                                borderTop:
                                  `1px solid ${theme.border}`,
                              }}
                            >
                              {threadEmail.htmlBody ? (
                                <iframe
                                  title={`Thread message ${
                                    index + 1
                                  }`}
                                  srcDoc={
                                    threadEmail.htmlBody
                                  }
                                  sandbox=""
                                  style={{
                                    width: "100%",
                                    minHeight:
                                      "180px",
                                    border: "none",
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    whiteSpace:
                                      "pre-wrap",
                                    lineHeight:
                                      "1.6",
                                    fontSize:
                                      "13px",
                                  }}
                                >
                                  {threadEmail.textBody ||
                                    threadEmail.snippet ||
                                    "No message content"}
                                </div>
                              )}
                            </div>

                            {threadEmail.id !==
                              selectedEmail.id &&
                              threadEmail.id && (
                                <button
                                  onClick={() =>
                                    openEmail(
                                      threadEmail.id
                                    )
                                  }
                                  style={{
                                    marginTop:
                                      "12px",
                                    padding:
                                      "7px 11px",
                                    border:
                                      `1px solid ${theme.border}`,
                                    borderRadius:
                                      "7px",
                                    background:
                                      theme.surface,
                                    color:
                                      theme.text,
                                    cursor:
                                      "pointer",
                                    fontSize:
                                      "11px",
                                    fontWeight:
                                      "700",
                                  }}
                                >
                                  Open this message
                                </button>
                              )}
                          </div>
                        )
                      )}
                    </div>
                  )}
              </>
            )}
          </div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "flex-end",
                marginBottom: "24px",
              }}
            >
              <div>
                <div
                  style={{
                    color: theme.primary,
                    fontSize: "12px",
                    fontWeight: "800",
                    letterSpacing: "0.1em",
                    marginBottom: "6px",
                  }}
                >
                  WORKSPACE
                </div>

                <h1
                  style={{
                    margin: 0,
                    fontSize: "30px",
                    letterSpacing: "-0.04em",
                  }}
                >
                  {activePage}
                </h1>
              </div>

              {activePage !== "Compose" && (
                <div
                  style={{
                    fontSize: "12px",
                    color: theme.muted,
                  }}
                >
                  ● Connected to Gmail
                </div>
              )}
            </div>

            {(activePage === "Inbox" ||
              activePage === "Sent") && (
              <div
                style={{
                  background: theme.surface,
                  border:
                    `1px solid ${theme.border}`,
                  padding: "18px",
                  borderRadius: "14px",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{ marginBottom: "15px" }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "15px",
                    }}
                  >
                    Search & Filters
                  </h3>

                  <span
                    style={{
                      color: theme.muted,
                      fontSize: "12px",
                    }}
                  >
                    Refine your Gmail results
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(2, minmax(0, 1fr))",
                    gap: "10px",
                  }}
                >
                  <input
                    value={keyword}
                    onChange={(e) =>
                      setKeyword(
                        e.target.value
                      )
                    }
                    placeholder="Keyword"
                    style={{
                      ...filterInputStyle,
                      background:
                        theme.surface,
                      color: theme.text,
                      borderColor:
                        theme.border,
                    }}
                  />

                  <input
                    value={sender}
                    onChange={(e) =>
                      setSender(
                        e.target.value
                      )
                    }
                    placeholder="Sender email"
                    style={{
                      ...filterInputStyle,
                      background:
                        theme.surface,
                      color: theme.text,
                      borderColor:
                        theme.border,
                    }}
                  />

                  <select
                    value={dateFilter}
                    onChange={(e) =>
                      setDateFilter(
                        e.target.value
                      )
                    }
                    style={{
                      ...filterInputStyle,
                      background:
                        theme.surface,
                      color: theme.text,
                      borderColor:
                        theme.border,
                    }}
                  >
                    <option value="all">
                      Any date
                    </option>
                    <option value="1d">
                      Last 1 day
                    </option>
                    <option value="3d">
                      Last 3 days
                    </option>
                    <option value="7d">
                      Last 7 days
                    </option>
                    <option value="10d">
                      Last 10 days
                    </option>
                    <option value="30d">
                      Last 30 days
                    </option>
                  </select>

                  <select
                    value={readFilter}
                    onChange={(e) =>
                      setReadFilter(
                        e.target.value
                      )
                    }
                    style={{
                      ...filterInputStyle,
                      background:
                        theme.surface,
                      color: theme.text,
                      borderColor:
                        theme.border,
                    }}
                  >
                    <option value="all">
                      All emails
                    </option>
                    <option value="unread">
                      Unread only
                    </option>
                    <option value="read">
                      Read only
                    </option>
                  </select>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    marginTop: "12px",
                  }}
                >
                  <button
                    onClick={applyFilters}
                    style={
                      primarySmallButton
                    }
                  >
                    Apply filters
                  </button>

                  <button
                    onClick={clearFilters}
                    style={{
                      ...secondarySmallButton,
                      background:
                        theme.surface,
                      color: theme.text,
                      borderColor:
                        theme.border,
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {activePage === "Inbox" && (
              <EmailList
                emails={emails}
                loading={loading}
                onOpenEmail={openEmail}
                theme={theme}
              />
            )}

            {activePage === "Sent" && (
              <EmailList
                emails={emails}
                loading={loading}
                onOpenEmail={openEmail}
                theme={theme}
              />
            )}

            {activePage === "Compose" && (
              <div
                style={{
                  background: theme.surface,
                  border:
                    `1px solid ${theme.border}`,
                  borderRadius: "14px",
                  padding: "28px",
                  maxWidth: "760px",
                  boxShadow:
                    "0 8px 30px rgba(15,23,42,0.05)",
                }}
              >
                <div
                  style={{ marginBottom: "22px" }}
                >
                  <div
                    style={{
                      color: theme.primary,
                      fontSize: "12px",
                      fontWeight: "800",
                      letterSpacing: "0.1em",
                      marginBottom: "5px",
                    }}
                  >
                    NEW MESSAGE
                  </div>

                  <h2
                    style={{
                      margin: 0,
                      fontSize: "24px",
                      letterSpacing:
                        "-0.03em",
                    }}
                  >
                    Compose email
                  </h2>
                </div>

                <input
                  value={to}
                  onChange={(e) =>
                    setTo(e.target.value)
                  }
                  placeholder="Recipient email"
                  type="email"
                  style={{
                    ...inputStyle,
                    background:
                      theme.surface,
                    color: theme.text,
                    borderColor:
                      theme.border,
                  }}
                />

                <input
                  value={subject}
                  onChange={(e) =>
                    setSubject(
                      e.target.value
                    )
                  }
                  placeholder="Subject"
                  style={{
                    ...inputStyle,
                    background:
                      theme.surface,
                    color: theme.text,
                    borderColor:
                      theme.border,
                  }}
                />

                <textarea
                  value={message}
                  onChange={(e) =>
                    setMessage(
                      e.target.value
                    )
                  }
                  placeholder="Write your message..."
                  rows={12}
                  style={{
                    ...inputStyle,
                    background:
                      theme.surface,
                    color: theme.text,
                    borderColor:
                      theme.border,
                    resize: "vertical",
                    minHeight: "220px",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "15px",
                  }}
                >
                  <button
                    onClick={sendEmail}
                    disabled={sending}
                    style={{
                      ...primaryButtonStyle,
                      opacity: sending
                        ? 0.7
                        : 1,
                    }}
                  >
                    {sending
                      ? "Sending..."
                      : "Send email"}
                  </button>

                  {sendStatus && (
                    <span
                      style={{
                        fontSize: "13px",
                        color: theme.muted,
                        fontWeight: "600",
                      }}
                    >
                      {sendStatus}
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <aside
        style={{
          width: "325px",
          background: theme.surface,
          borderLeft:
            `1px solid ${theme.border}`,
          padding: "25px",
          boxSizing: "border-box",
          flexShrink: 0,
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "8px",
          }}
        >
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background:
                theme.primarySoft,
              color: theme.primary,
              display: "flex",
              alignItems: "center",
              justifyContent:
                "center",
              fontWeight: "800",
              fontSize: "12px",
            }}
          >
            AI
          </div>

          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
              }}
            >
              Mail Copilot
            </h2>

            <span
              style={{
                color: theme.muted,
                fontSize: "12px",
              }}
            >
              AI-powered email control
            </span>
          </div>
        </div>

        <p
          style={{
            color: theme.muted,
            fontSize: "13px",
            lineHeight: "1.5",
            marginBottom: "20px",
          }}
        >
          Use natural language to search,
          navigate, compose, reply, or
          forward emails.
        </p>

        <div
          style={{
            background: theme.soft,
            border:
              `1px solid ${theme.border}`,
            borderRadius: "12px",
            padding: "15px",
            marginBottom: "15px",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: "800",
              color: theme.muted,
              marginBottom: "10px",
              textTransform:
                "uppercase",
              letterSpacing:
                "0.08em",
            }}
          >
            Try asking
          </div>

          <p style={suggestionStyle}>
            “Show unread emails from this
            week”
          </p>

          <p style={suggestionStyle}>
            “Open my latest email”
          </p>

          <p style={suggestionStyle}>
            “Reply to this saying thanks”
          </p>

          <p
            style={{
              ...suggestionStyle,
              marginBottom: 0,
            }}
          >
            “Forward this email to someone”
          </p>
        </div>

        <input
          value={aiCommand}
          onChange={(e) =>
            setAiCommand(e.target.value)
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleAICommand();
            }
          }}
          placeholder="Ask your mail copilot..."
          style={{
            ...inputStyle,
            background: theme.surface,
            color: theme.text,
            borderColor: theme.border,
          }}
        />

        <button
          onClick={handleAICommand}
          disabled={aiLoading}
          style={{
            ...primaryButtonStyle,
            width: "100%",
            opacity: aiLoading
              ? 0.7
              : 1,
          }}
        >
          {aiLoading
            ? "Processing..."
            : "Ask Copilot"}
        </button>

        {aiStatus && (
          <div
            style={{
              marginTop: "15px",
              padding: "13px",
              background:
                theme.primarySoft,
              color: theme.text,
              borderRadius: "10px",
              fontSize: "13px",
              lineHeight: "1.5",
              border:
                `1px solid ${theme.border}`,
            }}
          >
            {aiStatus}
          </div>
        )}

        {aiPreviewEmails.length > 0 && (
          <div style={{ marginTop: "18px" }}>
            <div
              style={{
                fontSize: "11px",
                fontWeight: "800",
                color: theme.muted,
                marginBottom: "9px",
                textTransform:
                  "uppercase",
                letterSpacing:
                  "0.08em",
              }}
            >
              Matching emails
            </div>

            {aiPreviewEmails.map(
              (email) => (
                <button
                  key={email.id}
                  onClick={() =>
                    openEmail(email.id)
                  }
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border:
                      `1px solid ${theme.border}`,
                    background:
                      email.isUnread
                        ? theme.primarySoft
                        : theme.surface,
                    color: theme.text,
                    borderRadius: "10px",
                    padding: "11px",
                    marginBottom: "8px",
                    cursor: "pointer",
                    display: "block",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: "8px",
                      alignItems:
                        "flex-start",
                    }}
                  >
                    <div
                      style={{
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight:
                            email.isUnread
                              ? "800"
                              : "700",
                          overflow:
                            "hidden",
                          textOverflow:
                            "ellipsis",
                          whiteSpace:
                            "nowrap",
                          marginBottom:
                            "4px",
                        }}
                      >
                        {email.from ||
                          "Unknown sender"}
                      </div>

                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight:
                            "700",
                          overflow:
                            "hidden",
                          textOverflow:
                            "ellipsis",
                          whiteSpace:
                            "nowrap",
                          marginBottom:
                            "5px",
                        }}
                      >
                        {email.subject ||
                          "(No subject)"}
                      </div>

                      <div
                        style={{
                          fontSize: "11px",
                          color:
                            theme.muted,
                          overflow:
                            "hidden",
                          textOverflow:
                            "ellipsis",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {email.snippet ||
                          "No preview available"}
                      </div>
                    </div>

                    {email.isUnread && (
                      <span
                        style={{
                          flexShrink: 0,
                          fontSize: "9px",
                          fontWeight:
                            "800",
                          background:
                            theme.primary,
                          color: "white",
                          padding:
                            "3px 6px",
                          borderRadius:
                            "10px",
                        }}
                      >
                        NEW
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: "7px",
                      fontSize: "10px",
                      color:
                        theme.muted,
                    }}
                  >
                    {email.date}
                  </div>
                </button>
              )
            )}
          </div>
        )}

        <div
          style={{
            marginTop: "20px",
            paddingTop: "15px",
            borderTop:
              `1px solid ${theme.border}`,
            fontSize: "11px",
            color: theme.muted,
            lineHeight: "1.5",
          }}
        >
          AI controls the main mail
          interface through natural
          language.
        </div>
      </aside>
    </main>
  );
}

function EmailList({
  emails,
  loading,
  onOpenEmail,
  theme,
}: {
  emails: any[];
  loading: boolean;
  onOpenEmail: (id: string) => void;
  theme: any;
}) {
  if (loading) {
    return <LoadingCard theme={theme} />;
  }

  if (emails.length === 0) {
    return (
      <div
        style={{
          background: theme.surface,
          border:
            `1px solid ${theme.border}`,
          padding: "45px 30px",
          borderRadius: "14px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "30px",
            marginBottom: "10px",
          }}
        >
          ✉
        </div>

        <h3
          style={{
            margin: "0 0 7px",
          }}
        >
          No emails found
        </h3>

        <p
          style={{
            color: theme.muted,
            margin: 0,
            fontSize: "13px",
          }}
        >
          Try changing your search or
          filters.
        </p>
      </div>
    );
  }

  return (
    <div>
      {emails.map((email) => (
        <div
          key={email.id}
          onClick={() =>
            onOpenEmail(email.id)
          }
          style={{
            cursor: "pointer",
            background: email.isUnread
              ? theme.primarySoft
              : theme.surface,
            padding: "18px 20px",
            marginTop: "10px",
            border:
              `1px solid ${
                email.isUnread
                  ? theme.primary
                  : theme.border
              }`,
            borderRadius: "12px",
            boxShadow: email.isUnread
              ? "0 3px 12px rgba(37,99,235,0.06)"
              : "none",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              gap: "15px",
            }}
          >
            <div
              style={{
                minWidth: 0,
                flex: 1,
              }}
            >
              <div
                style={{
                  fontWeight:
                    email.isUnread
                      ? "700"
                      : "500",
                  fontSize: "14px",
                  marginBottom: "6px",
                  overflow: "hidden",
                  textOverflow:
                    "ellipsis",
                  whiteSpace:
                    "nowrap",
                }}
              >
                {email.from}
              </div>

              {email.to && (
                <div
                  style={{
                    color: theme.muted,
                    fontSize: "12px",
                    marginBottom: "7px",
                  }}
                >
                  To: {email.to}
                </div>
              )}

              <div
                style={{
                  fontWeight:
                    email.isUnread
                      ? "700"
                      : "600",
                  fontSize: "15px",
                  marginBottom: "6px",
                }}
              >
                {email.subject ||
                  "(No subject)"}
              </div>

              <div
                style={{
                  color: theme.muted,
                  fontSize: "13px",
                  overflow: "hidden",
                  textOverflow:
                    "ellipsis",
                  whiteSpace:
                    "nowrap",
                }}
              >
                {email.snippet}
              </div>
            </div>

            <div
              style={{
                color: theme.muted,
                fontSize: "11px",
                whiteSpace:
                  "nowrap",
              }}
            >
              {email.date}
            </div>
          </div>

          {email.isUnread && (
            <span
              style={{
                display: "inline-block",
                marginTop: "10px",
                padding: "3px 8px",
                borderRadius: "20px",
                background:
                  theme.primary,
                color: "white",
                fontSize: "10px",
                fontWeight: "700",
              }}
            >
              UNREAD
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function LoadingCard({
  theme,
}: {
  theme: any;
}) {
  return (
    <div
      style={{
        background: theme.surface,
        border:
          `1px solid ${theme.border}`,
        padding: "30px",
        borderRadius: "14px",
        color: theme.muted,
        textAlign: "center",
      }}
    >
      Loading emails...
    </div>
  );
}

const navButtonStyle = {
  width: "100%",
  padding: "12px 14px",
  marginBottom: "6px",
  border: "none",
  borderRadius: "9px",
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  cursor: "pointer",
  fontSize: "14px",
};

const backButtonStyle = {
  padding: "9px 14px",
  marginBottom: "18px",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "13px",
};

const secondaryButtonStyle = {
  padding: "9px 15px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  background: "white",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "13px",
};

const inputStyle = {
  width: "100%",
  padding: "12px 13px",
  marginTop: "9px",
  marginBottom: "12px",
  border: "1px solid #d1d5db",
  borderRadius: "9px",
  boxSizing: "border-box" as const,
  fontSize: "13px",
  outline: "none",
};

const filterInputStyle = {
  width: "100%",
  padding: "10px 11px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  boxSizing: "border-box" as const,
  fontSize: "13px",
};

const primaryButtonStyle = {
  padding: "11px 18px",
  border: "none",
  borderRadius: "9px",
  background: "#2563eb",
  color: "white",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "13px",
};

const primarySmallButton = {
  padding: "9px 15px",
  border: "none",
  borderRadius: "8px",
  background: "#2563eb",
  color: "white",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "12px",
};

const secondarySmallButton = {
  padding: "9px 15px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "12px",
};

const suggestionStyle = {
  margin: "0 0 9px",
  fontSize: "12px",
  color: "#64748b",
  lineHeight: "1.45",
};