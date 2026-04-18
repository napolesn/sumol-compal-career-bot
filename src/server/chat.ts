import { createServerFn } from "@tanstack/react-start";
import { RECRUITER_SYSTEM_PROMPT } from "@/lib/recruiter-prompt";

type ChatMessage = { role: "user" | "assistant"; content: string };

function isMessageArray(input: unknown): input is { messages: ChatMessage[] } {
  if (!input || typeof input !== "object") return false;
  const m = (input as { messages?: unknown }).messages;
  if (!Array.isArray(m)) return false;
  return m.every(
    (x) =>
      x &&
      typeof x === "object" &&
      (x as ChatMessage).role &&
      typeof (x as ChatMessage).content === "string" &&
      ((x as ChatMessage).role === "user" || (x as ChatMessage).role === "assistant"),
  );
}

export const chatStream = createServerFn({ method: "POST", response: "raw" })
  .inputValidator((input: unknown) => {
    if (!isMessageArray(input)) {
      throw new Error("Invalid input: expected { messages: ChatMessage[] }");
    }
    if (input.messages.length === 0 || input.messages.length > 60) {
      throw new Error("Invalid input: messages length must be 1..60");
    }
    for (const m of input.messages) {
      if (m.content.length > 4000) throw new Error("Message too long");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        stream: true,
        messages: [
          { role: "system", content: RECRUITER_SYSTEM_PROMPT },
          ...data.messages,
        ],
      }),
    });

    if (!upstream.ok) {
      if (upstream.status === 429) {
        return new Response(
          JSON.stringify({ error: "Demasiados pedidos. Tenta de novo em instantes." }),
          { status: 429, headers: { "Content-Type": "application/json" } },
        );
      }
      if (upstream.status === 402) {
        return new Response(
          JSON.stringify({ error: "Sem créditos disponíveis no workspace Lovable AI." }),
          { status: 402, headers: { "Content-Type": "application/json" } },
        );
      }
      const t = await upstream.text();
      console.error("AI gateway error:", upstream.status, t);
      return new Response(JSON.stringify({ error: "Erro no AI gateway" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  });
