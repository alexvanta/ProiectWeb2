import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth/rbac";
import { MatchSheetClient } from "@/components/MatchSheetClient";

export const dynamic = "force-dynamic";

export default async function MatchSheetPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "CAPTAIN" && user.role !== "ADMIN") {
    return (
      <main className="p19-container">
        <div className="p19-panel" style={{ padding: "var(--space-6)" }}>
          Acces restricționat: doar Căpitanul echipei sau Adminul poate depune foaia de meci.
        </div>
      </main>
    );
  }

  const { matchId } = await params;
  const fixture = await prisma.fixture.findUnique({
    where: { id: matchId },
    include: {
      season: true,
      homeTeam: true,
      awayTeam: true,
      matchSheets: { include: { entries: true } },
    },
  });

  if (!fixture) notFound();

  const team =
    user.role === "CAPTAIN" && user.teamId === fixture.awayTeamId
      ? fixture.awayTeam
      : user.role === "CAPTAIN" && user.teamId === fixture.homeTeamId
        ? fixture.homeTeam
        : user.role === "ADMIN"
          ? fixture.homeTeam
          : null;

  if (!team) {
    return (
      <main className="p19-container">
        <div className="p19-panel" style={{ padding: "var(--space-6)" }}>
          Nu poți depune foaia de meci pentru o echipă din care nu faci parte.
        </div>
      </main>
    );
  }

  const registrations = await prisma.playerSeasonRegistration.findMany({
    where: { seasonId: fixture.seasonId, teamId: team.id, leftAt: null },
    include: {
      player: {
        include: {
          suspensions: { where: { remainingRounds: { gt: 0 } } },
        },
      },
    },
    orderBy: [{ isCaptain: "desc" }, { shirtNumber: "asc" }],
  });

  const existingSheet = fixture.matchSheets.find((ms) => ms.teamId === team.id);
  const existingMap = new Map(
    (existingSheet?.entries ?? []).map((e) => [e.playerId, e]),
  );

  return (
    <main className="p19-container" style={{ display: "grid", gap: "var(--space-5)" }}>
      <div>
        <h1 className="font-display" style={{ margin: 0, fontSize: "28px" }}>
          Foaie de meci · {team.name}
        </h1>
        <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "13px" }}>
          Etapa {fixture.roundNumber}: {fixture.homeTeam.name} – {fixture.awayTeam.name} ·{" "}
          {fixture.season.name}
        </p>
      </div>

      <MatchSheetClient
        fixtureId={fixture.id}
        teamId={team.id}
        teamName={team.name}
        minPlayers={fixture.season.minMatchSheetPlayers}
        maxStarters={fixture.season.maxMatchSheetStarters}
        squad={registrations.map((r) => {
          const existing = existingMap.get(r.playerId);
          const suspendedRounds = r.player.suspensions.reduce(
            (sum, s) => sum + s.remainingRounds,
            0,
          );
          return {
            playerId: r.playerId,
            fullName: r.player.fullName,
            position: r.player.position,
            shirtNumber: r.shirtNumber,
            suspendedRounds,
            initiallySelected: Boolean(existing),
            initiallyStarter: existing ? existing.isStarter : false,
          };
        })}
      />
    </main>
  );
}
