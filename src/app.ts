import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import fastifyCompress from "@fastify/compress";
import multipart from "@fastify/multipart";
import prismaPlugin from "./plugins/prisma";
import authPlugin from "./plugins/auth";
import authRoutes from "./modules/auth/auth.routes";
import caloriesRoutes from "./modules/calories/calories.routes";
import dailyLogsRoutes from "./modules/daily-logs/daily-logs.routes";
import foodEntryRoutes from "./modules/food-entry/food-entry.routes";
import recipesRoutes from "./modules/recipes/recipes.routes";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import "dotenv/config";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true,
    bodyLimit: 15 * 1024 * 1024, // 15MB global request body limit for mobile photo uploads
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const normalizeOrigin = (origin: string) => origin.trim().replace(/\/+$/, "");

  const frontendUrls = [
    ...(process.env.FRONTEND_URL ?? "http://localhost:5173")
      .split(",")
      .map(normalizeOrigin),
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
      .split(",")
      .map(normalizeOrigin),
  ]
    .filter(Boolean)
    .filter((value, index, self) => self.indexOf(value) === index);

  app.log.info(
    {
      rawFrontendUrl: process.env.FRONTEND_URL,
      rawTrustedOrigins: process.env.BETTER_AUTH_TRUSTED_ORIGINS,
      frontendUrls,
    },
    "Configured allowed CORS origins",
  );

  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        // Allow non-browser requests such as curl / server-side calls
        app.log.debug({ origin: null }, "CORS origin check: no origin");
        return callback(null, true);
      }

      const normalized = normalizeOrigin(origin);
      const allowed = frontendUrls.includes(normalized);
      app.log.debug({ origin, normalizedOrigin: normalized, allowed }, "CORS origin check");

      if (allowed) {
        return callback(null, true);
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  // Register multipart before helmet to avoid content-type issues
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max file size
    },
  });

  // Add content type parsers for direct image uploads
  const imageTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ];
  imageTypes.forEach((type) => {
    app.addContentTypeParser(
      type,
      { parseAs: "buffer" },
      function (req, body, done) {
        done(null, body);
      },
    );
  });

  await app.register(helmet);
  await app.register(fastifyCompress);
  await app.register(prismaPlugin);
  await app.register(authPlugin);

  // Routes
  await app.register(import("./modules/health/health.routes"), {
    prefix: "/health",
  });
  await app.register(authRoutes);
  await app.register(caloriesRoutes, { prefix: "/api/calories" });
  await app.register(dailyLogsRoutes, { prefix: "/api/daily-logs" });
  await app.register(foodEntryRoutes, { prefix: "/api/food-entry" });
  await app.register(recipesRoutes, { prefix: "/api/recipes" });
  // Error handling
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    if (error instanceof Error) {
      reply.status((error as any).statusCode ?? 500).send({
        message: error.message,
      });
    } else {
      reply.status(500).send({
        message: "Unknown error",
      });
    }
  });

  return app;
}
