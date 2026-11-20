export default function HomePage() {
  return (
    <main
      style={{
        maxWidth: "var(--container-max)",
        margin: "0 auto",
        padding: "var(--space-6) var(--space-4)",
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "28px",
          lineHeight: "32px",
          fontWeight: 700,
        }}
      >
        SuperLiga României — Sezon regular
      </h1>
      <p
        style={{
          marginTop: "var(--space-2)",
          color: "var(--text-secondary)",
        }}
      >
        Infrastructura de bază P19 (Faza 1) este pregătită.
      </p>
    </main>
  );
}
