import { NextResponse } from "next/server";
import { getCurrentUser, handleApiError } from "@/server/auth/rbac";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({
      user: user ?? null,
      role: user?.role ?? "VISITOR",
    });
  } catch (err) {
    return handleApiError(err);
  }
}
