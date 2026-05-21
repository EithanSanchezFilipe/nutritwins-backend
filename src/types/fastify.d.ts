import { PrismaClient, User as PrismaUser } from "../generated/prisma/client";
import type { Auth } from "better-auth/types";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    auth: Auth;
  }
  interface FastifyRequest {
    user: PrismaUser;
  }
}
