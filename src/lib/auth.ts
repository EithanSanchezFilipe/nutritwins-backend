import { PrismaClient } from "../generated/prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { expo } from "@better-auth/expo";
import "dotenv/config";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const normalizeOrigin = (origin: string) => origin.trim().replace(/\/+$/, "");

const auth = (prisma: PrismaClient = new PrismaClient({ adapter })) =>
  betterAuth({
    secret: process.env.BETTER_AUTH_SECRET!,
    url: process.env.BETTER_AUTH_URL!,
    database: prismaAdapter(prisma as PrismaClient, {
      provider: "postgresql",
    }),
    trustedOrigins: [
      "nutritwins://",
      ...(process.env.FRONTEND_URL ?? "")
        .split(",")
        .map(normalizeOrigin),
      ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
        .split(",")
        .map(normalizeOrigin),
    ]
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index),
    emailAndPassword: {
      enabled: true,
    },
    user: {
      modelName: "user",
      additionalFields: {
        gender: {
          type: "string",
          required: false,
          input: true,
        },
        birthDate: {
          type: "date",
          required: false,
          input: true,
        },
        height: {
          type: "number",
          required: false,
          input: true,
        },
        weight: {
          type: "number",
          required: false,
          input: true,
        },
        activityLevel: {
          type: "string",
          required: false,
          input: true,
        },
        goal: {
          type: "string",
          required: false,
          input: true,
        },
        bmr: {
          type: "number",
          required: false,
          input: true,
        },
        tdee: {
          type: "number",
          required: false,
          input: true,
        },
        targetCal: {
          type: "number",
          required: false,
          input: true,
        },
      },
    },
    plugins: [expo()],
  });

export default auth;
