// src/hooks/auth.hook.ts
import { FastifyReply, FastifyRequest } from "fastify";
import { User as PrismaUser } from "../generated/prisma/client";

export const authenticate = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  // First, try to get session from Authorization Bearer token
  const authHeader = request.headers.authorization;
  let user: PrismaUser | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7); // Remove "Bearer " prefix
    try {
      // Query the session directly from database using the token
      const session = await request.server.prisma.session.findFirst({
        where: {
          token: token,
        },
        include: {
          user: true,
        },
      });

      if (session && session.expiresAt > new Date()) {
        user = session.user as PrismaUser;
        console.log("[auth] User authenticated via Bearer token:", user.email);
      }
    } catch (e) {
      console.log("[auth] Bearer token lookup failed:", e);
    }
  }

  // Fall back to session from cookies if Bearer token didn't work
  if (!user) {
    const session = await request.server.auth.api.getSession({
      headers: new Headers(request.headers as Record<string, string>),
    });

    if (session) {
      user = session.user as PrismaUser;
    }
  }

  if (!user) {
    return reply
      .status(401)
      .send({ message: "Unauthorized: No active session" });
  }

  request.user = user;
};
