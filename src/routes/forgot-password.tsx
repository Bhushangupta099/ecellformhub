import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordRedirect,
});

function ForgotPasswordRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: "/auth", search: { mode: "forgot" } as any });
  }, [navigate]);

  return null;
}
