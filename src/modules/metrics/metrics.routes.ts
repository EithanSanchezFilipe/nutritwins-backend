import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { MetricsSchema } from "./metrics.schemas";
import { authenticate } from "../../hooks/auth.hook";
import { MetricsBody } from "./metrics.interfaces";
import MetricsServices from "./metrics.service";

export const metricsRoutes = async (fastify: FastifyInstance) => {
  fastify.addHook("preHandler", authenticate);
  const service = new MetricsServices(fastify.prisma);
  // Define routes for metrics here
  fastify.get("/", async (request, reply) => {
    try {
      const metrics = await fastify.prisma.metrics.findMany({
        where: { userId: request.user.id },
        orderBy: { date: "desc" },
      });
      return reply.send(metrics);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ message: "Failed to fetch metrics" });
    }
  });

  fastify.withTypeProvider<ZodTypeProvider>().post(
    "/",
    {
      schema: {
        body: MetricsSchema,
      },
    },
    async (request, reply) => {
      const data: MetricsBody = request.body;
      try {
        return service.createMetric(data, request.user.id);
      } catch (error) {
        request.log.error(error);
        return reply
          .status(500)
          .send({ message: "Failed to create new metrics" });
      }
    },
  );

  fastify.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    return service.getById(request.user.id, id);
  });
};
