import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, requireRole } from "@/server/auth/rbac";
import { createPlayerTransfer } from "@/server/services/adminService";

const transferSchema = z.object({
  playerId: z.string().min(1),
  seasonId: z.string().min(1),
  toTeamId: z.string().min(1),
  shirtNumber: z.number().int().min(1).max(99).nullable().optional(),
  isCaptain: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    await requireRole(["ADMIN"]);
    const body = transferSchema.parse(await request.json());
    const registration = await createPlayerTransfer(body);
    return NextResponse.json({ registration }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
