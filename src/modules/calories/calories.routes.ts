import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { CalculateCaloriesSchema } from "./calories.schemas";
import { authenticate } from "../../hooks/auth.hook";
import { getAge } from "./calories.utils";
import { CaloriesService } from "./calories.service";
import { z } from "zod";

export const caloriesRoutes = async (fastify: FastifyInstance) => {
  const service = new CaloriesService(fastify.prisma);

  fastify.withTypeProvider<ZodTypeProvider>().post(
    "/calculate",
    {
      preHandler: [authenticate],
      schema: {
        body: CalculateCaloriesSchema,
      },
    },
    async (request, reply) => {
      const { birthDate, ...rest } = request.body;

      try {
        const result = await service.calculateAndUpdateUser(request.user.id, {
          ...rest,
          birthDate,
          age: getAge(birthDate),
        });

        return reply.send(result);
      } catch (error) {
        request.log.error(error);
        return reply
          .status(500)
          .send({ message: "Failed to calculate results" });
      }
    },
  );

  // GET user profile stats and allergies
  fastify.get(
    "/profile",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = await fastify.prisma.user.findUnique({
          where: { id: request.user.id },
          include: {
            allergies: true,
          },
        });
        if (!user) {
          return reply.status(404).send({ message: "User not found" });
        }
        return reply.send({
          id: user.id,
          name: user.name,
          email: user.email,
          gender: user.gender,
          birthDate: user.birthDate,
          height: user.height,
          weight: user.weight,
          activityLevel: user.activityLevel,
          goal: user.goal,
          bmr: user.bmr,
          tdee: user.tdee,
          targetCal: user.targetCal,
          allergies: user.allergies.map((a) => a.name),
        });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ message: "Failed to load user profile" });
      }
    },
  );

  // PUT update user allergies list
  fastify.withTypeProvider<ZodTypeProvider>().put(
    "/allergies",
    {
      preHandler: [authenticate],
      schema: {
        body: z.object({
          allergies: z.array(z.string()),
        }),
      },
    },
    async (request, reply) => {
      const { allergies } = request.body;

      try {
        // Disconnect all existing allergies
        await fastify.prisma.user.update({
          where: { id: request.user.id },
          data: {
            allergies: {
              set: [],
            },
          },
        });

        // Link/Create the updated list of allergies
        const updated = await fastify.prisma.user.update({
          where: { id: request.user.id },
          data: {
            allergies: {
              connectOrCreate: allergies.map((name) => ({
                where: { name },
                create: { name },
              })),
            },
          },
          include: {
            allergies: true,
          },
        });

        return reply.send({
          allergies: updated.allergies.map((a) => a.name),
        });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ message: "Failed to update allergies" });
      }
    },
  );
};

export default caloriesRoutes;
