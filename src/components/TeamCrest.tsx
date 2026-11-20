interface TeamCrestProps {
  shortName: string;
  colorA: string;
  colorB: string;
  size?: "sm" | "md" | "lg";
}

export function TeamCrest({
  shortName,
  colorA,
  colorB,
  size = "sm",
}: TeamCrestProps) {
  const dim = size === "lg" ? 44 : size === "md" ? 30 : 24;
  const fontSize = size === "lg" ? 13 : size === "md" ? 10 : 9;

  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: `${dim}px`,
        height: `${dim}px`,
        minWidth: `${dim}px`,
        borderRadius: "var(--radius-md)",
        background: `linear-gradient(135deg, ${colorA}, ${colorB})`,
        color: "#FFFFFF",
        fontSize: `${fontSize}px`,
        fontWeight: 700,
        letterSpacing: "0.02em",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
        textShadow: "0 1px 1px rgba(0,0,0,0.45)",
      }}
    >
      {shortName.slice(0, 3).toUpperCase()}
    </span>
  );
}
