import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, requireRole } from "@/server/auth/rbac";
import { generateOrCommitSeasonSchedule } from "@/server/services/adminService";

const scheduleSchema = z.object({
  seasonId: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  daysBetweenRounds: z.number().int().min(1).max(30).optional(),
  confirm: z.boolean().default(false),
});

export async function POST(request: Request) {
  try {
    await requireRole(["ADMIN"]);
    const body = scheduleSchema.parse(await request.json());
    const result = await generateOrCommitSeasonSchedule(body);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
