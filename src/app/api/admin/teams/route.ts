import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, requireRole } from "@/server/auth/rbac";
import { createAdminTeam } from "@/server/services/adminService";

const createTeamSchema = z.object({
  name: z.string().min(2),
  shortName: z.string().min(2).max(5),
  slug: z.string().min(2),
  crestColorA: z.string().optional(),
  crestColorB: z.string().optional(),
  homePitchId: z.string().nullable().optional(),
  seasonId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    await requireRole(["ADMIN"]);
    const body = createTeamSchema.parse(await request.json());
    const team = await createAdminTeam(body);
    return NextResponse.json({ team }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
