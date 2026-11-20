import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, requireRole } from "@/server/auth/rbac";
import { createAdminUser } from "@/server/services/adminService";

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(["PLAYER", "CAPTAIN", "REFEREE_ORGANIZER", "ADMIN"]),
  teamId: z.string().nullable().optional(),
  playerId: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    await requireRole(["ADMIN"]);
    const body = createUserSchema.parse(await request.json());
    const user = await createAdminUser(body);
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
