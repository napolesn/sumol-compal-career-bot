import { createFileRoute } from "@tanstack/react-router";
import { ChatWindow } from "@/components/ChatWindow";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Recrutador Virtual · Sumol Compal" },
      {
        name: "description",
        content:
          "Conversa com o Recrutador Virtual da Sumol Compal sobre Oportunidades, Estágios e Candidaturas Espontâneas em Portugal.",
      },
      { property: "og:title", content: "Recrutador Virtual · Sumol Compal" },
      {
        property: "og:description",
        content:
          "Assistente de recrutamento virtual da Sumol Compal: oportunidades, estágios e candidaturas espontâneas.",
      },
    ],
  }),
});

function Index() {
  return (
    <main className="min-h-dvh w-full bg-background">
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-3 py-2 sm:px-6 sm:py-4">
        <ChatWindow />
      </div>
    </main>
  );
}
