interface TeamCrestProps {
  shortName: string;
  colorA: string;
  colorB: string;
  size?: "xs" | "sm" | "md" | "lg" | "sb";
}

export function TeamCrest({
  shortName,
  colorA,
  colorB,
  size = "sm",
}: TeamCrestProps) {
  const sizeClass =
    size === "xs"
      ? "team-crest team-crest-xs"
      : size === "md"
        ? "team-crest team-crest-md"
        : size === "lg"
          ? "team-crest team-crest-lg"
          : size === "sb"
            ? "team-crest sb-crest"
            : "team-crest";

  return (
    <span
      aria-hidden="true"
      className={sizeClass}
      style={{
        background: `linear-gradient(135deg, ${colorA} 0%, ${colorB} 100%)`,
      }}
    >
      {shortName.slice(0, 3).toUpperCase()}
    </span>
  );
}
