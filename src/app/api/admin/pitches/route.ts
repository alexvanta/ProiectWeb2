import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, requireRole } from "@/server/auth/rbac";
import { createAdminPitch } from "@/server/services/adminService";

const createPitchSchema = z.object({
  name: z.string().min(2),
  city: z.string().min(2),
  address: z.string().nullable().optional(),
  sharedGroup: z.string().nullable().optional(),
  availabilities: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
      }),
    )
    .min(1),
});

export async function POST(request: Request) {
  try {
    await requireRole(["ADMIN"]);
    const body = createPitchSchema.parse(await request.json());
    const pitch = await createAdminPitch(body);
    return NextResponse.json({ pitch }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
