import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/server/auth/rbac";

export async function GET() {
  try {
    const seasons = await prisma.season.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        isActive: true,
      },
    });
    return NextResponse.json({ seasons });
  } catch (err) {
    return handleApiError(err);
  }
}
