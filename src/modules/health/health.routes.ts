// src/routes/health.ts
import { FastifyPluginAsync } from "fastify";

const healthRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get("/", async () => {
    return { status: "ok" };
  });
};

export default healthRoute;
