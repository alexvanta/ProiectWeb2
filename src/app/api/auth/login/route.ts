import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSession, SESSION_COOKIE_NAME } from "@/server/auth/session";
import { handleApiError } from "@/server/auth/rbac";

const loginSchema = z.object({
  email: z.string().email("Adresă de email invalidă."),
  password: z.string().min(1, "Parola este obligatorie."),
});

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const email = body.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        teamId: true,
        playerId: true,
        passwordHash: true,
      },
    });

    if (!user || !verifyPassword(body.password, user.passwordHash)) {
      return NextResponse.json(
        { error: "Email sau parolă incorectă." },
        { status: 401 },
      );
    }

    const { cookieValue, expiresAt } = await createSession(user.id);

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        teamId: user.teamId,
        playerId: user.playerId,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, cookieValue, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expiresAt,
    });

    return response;
  } catch (err) {
    return handleApiError(err);
  }
}
