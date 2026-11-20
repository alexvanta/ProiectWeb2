import { prisma } from "@/lib/prisma";
import { resolveSeason } from "@/server/queries/publicQueries";
import { FixturesClient } from "@/components/FixturesClient";

export const dynamic = "force-dynamic";

export default async function ProgramPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; round?: string }>;
}) {
  const { season, round } = await searchParams;
  const { current } = await resolveSeason(season);

  if (!current) {
    return (
      <main className="p19-container">
        <div className="p19-panel" style={{ padding: "var(--space-6)" }}>
          Nu există sezoane disponibile.
        </div>
      </main>
    );
  }

  const [fixtures, seasonTeams, pitches] = await Promise.all([
    prisma.fixture.findMany({
      where: { seasonId: current.id },
      include: {
        homeTeam: {
          select: {
            id: true,
            name: true,
            shortName: true,
            slug: true,
            crestColorA: true,
            crestColorB: true,
          },
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
            shortName: true,
            slug: true,
            crestColorA: true,
            crestColorB: true,
          },
        },
        pitch: { select: { id: true, name: true } },
      },
      orderBy: [{ roundNumber: "asc" }, { scheduledAt: "asc" }],
    }),
    prisma.seasonTeam.findMany({
      where: { seasonId: current.id },
      include: { team: { select: { id: true, name: true } } },
      orderBy: { team: { name: "asc" } },
    }),
    prisma.pitch.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <main className="p19-container" style={{ display: "grid", gap: "var(--space-5)" }}>
      <div>
        <h1 className="font-display" style={{ margin: 0, fontSize: "28px", lineHeight: "32px" }}>
          Program & rezultate · {current.name}
        </h1>
        <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "13px" }}>
          Filtrează meciurile după etapă, echipă, teren sau status și exportă calendarul iCal (.ics) per echipă.
        </p>
      </div>

      <FixturesClient
        seasonId={current.id}
        seasonName={current.name}
        fixtures={fixtures.map((f) => ({
          id: f.id,
          roundNumber: f.roundNumber,
          leg: f.leg,
          scheduledAt: f.scheduledAt.toISOString(),
          status: f.status,
          homeGoals: f.homeGoals,
          awayGoals: f.awayGoals,
          homeTeam: f.homeTeam,
          awayTeam: f.awayTeam,
          pitch: f.pitch,
        }))}
        teams={seasonTeams.map((st) => st.team)}
        pitches={pitches}
        initialRound={round ?? ""}
      />
    </main>
  );
}
