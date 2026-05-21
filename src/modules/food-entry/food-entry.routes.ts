// food-entry.routes.ts
import { FastifyInstance } from "fastify";
import { FoodEntryService } from "./food-entry.service";
import { authenticate } from "../../hooks/auth.hook";
import { FoodAnalysisTextBody } from "./food-entry.schemas";
import { ZodTypeProvider } from "fastify-type-provider-zod";

export const foodEntryRoutes = async (fastify: FastifyInstance) => {
  //fastify.addHook("preHandler", authenticate);
  const service = new FoodEntryService();

  fastify.post("/analyze/image", async (request, reply) => {
    try {
      let buffer: Buffer;
      let mimeType: string;
      const contentType = request.headers["content-type"] || "";

      if (contentType.startsWith("image/")) {
        buffer = request.body as Buffer;
        mimeType = contentType;
      } else if (contentType.startsWith("multipart/form-data")) {
        const data = await request.file();
        if (!data)
          return reply.status(400).send({ message: "No image file provided" });

        const allowedMimeTypes = [
          "image/jpeg",
          "image/png",
          "image/jpg",
          "image/webp",
        ];
        if (!allowedMimeTypes.includes(data.mimetype)) {
          return reply
            .status(400)
            .send({ message: "Invalid file type. Use JPEG, PNG, or WebP." });
        }

        buffer = await data.toBuffer();
        mimeType = data.mimetype;
      } else {
        return reply.status(400).send({ message: "Invalid content type." });
      }

      const language = Array.isArray(request.headers["x-app-language"])
        ? request.headers["x-app-language"][0]
        : request.headers["x-app-language"];

      const result = await service.analyzeFood({
        imageBuffer: buffer,
        mimeType,
        language,
      });
      return reply.send(result);
    } catch (error: any) {
      request.log.error(error);

      // Handle the "Not Food" 422 error
      if (error.statusCode === 422) {
        return reply.status(422).send({
          error: "Unprocessable Content",
          message: error.message,
        });
      }

      return reply.status(500).send({
        message: error.message || "Internal Server Error",
      });
    }
  });

  fastify
    .withTypeProvider<ZodTypeProvider>()
    .post(
      "/analyze/text",
      { schema: { body: FoodAnalysisTextBody } },
      async (request, reply) => {
        try {
          const language = Array.isArray(request.headers["x-app-language"])
            ? request.headers["x-app-language"][0]
            : request.headers["x-app-language"];
          const result = await service.analyzeFood({
            textDescription: request.body.description,
            language,
          });
          return reply.send(result);
        } catch (error: any) {
          request.log.error(error);

          if (error.statusCode === 422) {
            return reply
              .status(422)
              .send({ error: "Unprocessable Content", message: error.message });
          }

          return reply
            .status(500)
            .send({ message: error.message || "Failed to analyze text" });
        }
      },
    );
};

export default foodEntryRoutes;
