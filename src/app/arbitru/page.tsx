import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth/rbac";
import { RefereePanelClient } from "@/components/RefereePanelClient";

export const dynamic = "force-dynamic";

export default async function RefereePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "REFEREE_ORGANIZER" && user.role !== "ADMIN") {
    return (
      <main className="p19-container">
        <div className="p19-panel" style={{ padding: "var(--space-6)" }}>
          Acces restricționat: această pagină este disponibilă doar pentru Arbitru / Organizator sau Admin.
        </div>
      </main>
    );
  }

  const activeSeason = await prisma.season.findFirst({ where: { isActive: true } });

  const [fixtures, registrations, pitches, audits, alerts] = await Promise.all([
    activeSeason
      ? prisma.fixture.findMany({
          where: { seasonId: activeSeason.id },
          include: {
            homeTeam: { select: { id: true, name: true } },
            awayTeam: { select: { id: true, name: true } },
          },
          orderBy: [{ roundNumber: "asc" }, { scheduledAt: "asc" }],
          take: 48,
        })
      : [],
    activeSeason
      ? prisma.playerSeasonRegistration.findMany({
          where: { seasonId: activeSeason.id, leftAt: null },
          include: { player: { select: { id: true, fullName: true } } },
        })
      : [],
    prisma.pitch.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.resultCorrectionAudit.findMany({
      include: {
        actor: { select: { name: true } },
        fixture: {
          include: {
            homeTeam: { select: { name: true } },
            awayTeam: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.retroactiveSuspensionAlert.findMany({
      include: {
        player: { select: { fullName: true } },
        fixture: {
          include: {
            homeTeam: { select: { name: true } },
            awayTeam: { select: { name: true } },
          },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 20,
    }),
  ]);

  return (
    <main className="p19-container" style={{ display: "grid", gap: "var(--space-5)" }}>
      <div>
        <h1 className="font-display" style={{ margin: 0, fontSize: "28px" }}>
          Panou Arbitru / Organizator
        </h1>
        <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "13px" }}>
          Introducere rezultate, corecții cu jurnal imutabil de audit, reprogramări cu notificări in-app și revizuire alerte retroactive.
        </p>
      </div>

      <RefereePanelClient
        fixtures={fixtures.map((f) => ({
          id: f.id,
          roundNumber: f.roundNumber,
          homeTeamId: f.homeTeamId,
          homeTeamName: f.homeTeam.name,
          awayTeamId: f.awayTeamId,
          awayTeamName: f.awayTeam.name,
          status: f.status,
          homeGoals: f.homeGoals,
          awayGoals: f.awayGoals,
          scheduledAt: f.scheduledAt.toISOString(),
          pitchId: f.pitchId,
        }))}
        players={registrations.map((r) => ({
          id: r.player.id,
          fullName: r.player.fullName,
          teamId: r.teamId,
        }))}
        pitches={pitches}
        audits={audits.map((a) => ({
          id: a.id,
          fixtureLabel: `Et. ${a.fixture.roundNumber}: ${a.fixture.homeTeam.name} – ${a.fixture.awayTeam.name}`,
          actorName: a.actor.name,
          reason: a.reason,
          beforeSnapshot: a.beforeSnapshot,
          afterSnapshot: a.afterSnapshot,
          createdAt: a.createdAt.toISOString(),
        }))}
        alerts={alerts.map((al) => ({
          id: al.id,
          fixtureLabel: `Et. ${al.fixture.roundNumber}: ${al.fixture.homeTeam.name} – ${al.fixture.awayTeam.name}`,
          playerName: al.player.fullName,
          description: al.description,
          status: al.status,
        }))}
      />
    </main>
  );
}
