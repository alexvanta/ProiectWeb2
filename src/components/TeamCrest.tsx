"use client";

import { useEffect, useRef, useState } from "react";
import { resolveTeamCrestSrc } from "@/lib/teamCrests";

interface TeamCrestProps {
  slug?: string | null;
  shortName: string;
  colorA: string;
  colorB: string;
  size?: "xs" | "sm" | "md" | "lg" | "sb";
}

export function TeamCrest({
  slug,
  shortName,
  colorA,
  colorB,
  size = "sm",
}: TeamCrestProps) {
  const crestSrc = resolveTeamCrestSrc(slug, shortName);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const showImage = Boolean(crestSrc) && failedSrc !== crestSrc;

  useEffect(() => {
    const img = imgRef.current;
    if (showImage && crestSrc && img && img.complete && img.naturalWidth === 0) {
      setFailedSrc(crestSrc);
    }
  }, [crestSrc, showImage]);

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

  if (showImage && crestSrc) {
    return (
      <span aria-hidden="true" className={`${sizeClass} team-crest-has-img`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={crestSrc}
          alt=""
          className="team-crest-img"
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(crestSrc)}
        />
      </span>
    );
  }

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
