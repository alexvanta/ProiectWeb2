import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, requireRole } from "@/server/auth/rbac";
import { createAdminSeason } from "@/server/services/adminService";

const createSeasonSchema = z.object({
  name: z.string().min(3),
  slug: z.string().min(3),
  status: z.enum(["DRAFT", "ACTIVE", "COMPLETED"]).optional(),
  teamIds: z.array(z.string().min(1)).min(2),
  pointsWin: z.number().int().min(1).max(10).optional(),
  pointsDraw: z.number().int().min(0).max(10).optional(),
  pointsLoss: z.number().int().min(0).max(10).optional(),
  yellowCardThresholds: z.array(z.number().int().min(1)).optional(),
  yellowCardRepeatFrom: z.number().int().min(1).optional(),
  directRedDefaultRounds: z.number().int().min(1).max(24).optional(),
});

export async function POST(request: Request) {
  try {
    await requireRole(["ADMIN"]);
    const body = createSeasonSchema.parse(await request.json());
    const season = await createAdminSeason(body);
    return NextResponse.json({ season }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
