import { createFileRoute } from "@tanstack/react-router";
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
      ((x as ChatMessage).role === "user" || (x as ChatMessage).role === "assistant") &&
      typeof (x as ChatMessage).content === "string",
  );
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Corpo inválido" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (!isMessageArray(body)) {
          return new Response(JSON.stringify({ error: "Formato inválido" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { messages } = body;
        if (messages.length === 0 || messages.length > 60) {
          return new Response(JSON.stringify({ error: "Tamanho de conversa inválido" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        for (const m of messages) {
          if (m.content.length > 4000) {
            return new Response(JSON.stringify({ error: "Mensagem demasiado longa" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }
        }

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        const upstream = await fetch(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          {
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
                ...messages,
              ],
            }),
          },
        );

        if (!upstream.ok) {
          if (upstream.status === 429) {
            return new Response(
              JSON.stringify({
                error: "Demasiados pedidos. Tenta de novo em instantes.",
              }),
              { status: 429, headers: { "Content-Type": "application/json" } },
            );
          }
          if (upstream.status === 402) {
            return new Response(
              JSON.stringify({
                error: "Sem créditos disponíveis no workspace Lovable AI.",
              }),
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
      },
    },
  },
});
