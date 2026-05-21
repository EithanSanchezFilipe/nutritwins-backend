import { FastifyInstance } from "fastify";
import { authenticate } from "../../hooks/auth.hook";
import { DailyLogsService } from "./daily-logs.service";
import { MealType } from "./daily-logs.service";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { SaveFoodEntryBody } from "../food-entry/food-entry.schemas";

export const dailyLogsRoutes = async (fastify: FastifyInstance) => {
  fastify.addHook("preHandler", authenticate);

  const service = new DailyLogsService(fastify.prisma);

  fastify.get("/today", async (request, reply) => {
    try {
      const timezoneOffset = request.headers["x-timezone-offset"]
        ? Number(request.headers["x-timezone-offset"])
        : undefined;
      const dailyLog = await service.getTodayLog(
        request.user.id,
        timezoneOffset,
      );
      return reply.send(dailyLog);
    } catch (error: any) {
      if (error.message === "TARGET_CAL_NOT_SET") {
        return reply.status(400).send({
          message: "User target calories not set",
        });
      }

      request.log.error(error);
      return reply.status(500).send({ message: "Internal server error" });
    }
  });

  fastify.get("/", async (request) => {
    return service.getUserLogs(request.user.id);
  });

  fastify.get("/:id", async (request) => {
    const { id } = request.params as { id: string };
    return service.getById(request.user.id, id);
  });

  fastify
    .withTypeProvider<ZodTypeProvider>()
    .post(
      "/entries",
      { schema: { body: SaveFoodEntryBody } },
      async (request, reply) => {
        try {
          const { mealType, dishName, macros } = request.body;
          const timezoneOffset = request.headers["x-timezone-offset"]
            ? Number(request.headers["x-timezone-offset"])
            : undefined;
          const entry = await service.addFoodEntry(
            request.user.id,
            {
              mealType: mealType as MealType,
              dishName: dishName ?? "Plat inconnu",
              macros: macros ?? { calories: 0, protein: 0, carbs: 0, fat: 0 },
            },
            timezoneOffset,
          );
          return reply.status(201).send(entry);
        } catch (error: any) {
          if (error.message === "TARGET_CAL_NOT_SET") {
            return reply
              .status(400)
              .send({ message: "User target calories not set" });
          }
          request.log.error(error);
          return reply.status(500).send({ message: "Internal server error" });
        }
      },
    );
};

export default dailyLogsRoutes;
