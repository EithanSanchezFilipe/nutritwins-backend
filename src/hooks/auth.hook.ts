// src/hooks/auth.hook.ts
import { FastifyReply, FastifyRequest } from "fastify";
import { User as PrismaUser } from "../generated/prisma/client";

export const authenticate = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  // Get session from cookies via better-auth
  const session = await request.server.auth.api.getSession({
    headers: new Headers(request.headers as Record<string, string>),
  });

  if (!session) {
    return reply
      .status(401)
      .send({ message: "Unauthorized: No active session" });
  }

  const user = session.user as PrismaUser;

  if (!user) {
    return reply
      .status(401)
      .send({ message: "Unauthorized: User not found in session" });
  }

  request.user = user;
};
