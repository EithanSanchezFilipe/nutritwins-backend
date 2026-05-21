import { FastifyInstance } from "fastify";
import { authenticate } from "../../hooks/auth.hook";
import { RecipesService } from "./recipes.service";

export const recipesRoutes = (fastify: FastifyInstance) => {
  const service = new RecipesService(fastify.prisma);

  fastify.addHook("preHandler", authenticate);

  fastify.get("/suggestions", async (request, reply) => {
    try {
      const { mealType } = request.query as { mealType?: string };
      const timezoneOffset = request.headers["x-timezone-offset"]
        ? Number(request.headers["x-timezone-offset"])
        : undefined;
      const language = Array.isArray(request.headers["x-app-language"])
        ? request.headers["x-app-language"][0]
        : request.headers["x-app-language"];
      const result = await service.getSuggestions(request.user.id, mealType, timezoneOffset, language);
      return reply.send(result);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ message: "Internal server error" });
    }
  });
};
export default recipesRoutes;
