import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dash")({
  beforeLoad: () => {
    throw redirect({ to: "/app" });
  },
});
