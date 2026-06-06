import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, fontFamily: "system-ui" }}>
      <h1>Market Eye</h1>
      <Link to="/dash" style={{ padding: "10px 20px", background: "#111", color: "#fff", borderRadius: 8, textDecoration: "none" }}>
        Login
      </Link>
    </div>
  );
}
