import { createFileRoute } from "@tanstack/react-router";
import { chatStream } from "@/server/chat";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: ({ request }) => chatStream({ request }),
    },
  },
});
