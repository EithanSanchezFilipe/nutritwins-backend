import { FastifyInstance } from "fastify";
import "dotenv/config";

export const authRoutes = async (fastify: FastifyInstance) => {
  fastify.route({
    method: ["GET", "POST", "OPTIONS"],
    url: "/api/auth/*",
    async handler(request, reply) {
      if (request.method === "OPTIONS") {
        return reply.status(204).send();
      }

      try {
        // Construct request URL
        const url = new URL(request.url, `http://${request.headers.host}`);

        // Convert Fastify headers to standard Headers object
        const headers = new Headers();
        Object.entries(request.headers).forEach(([key, value]) => {
          if (value) headers.append(key, value.toString());
        });
        // Create Fetch API-compatible request
        const req = new Request(url.toString(), {
          method: request.method,
          headers,
          ...(request.body ? { body: JSON.stringify(request.body) } : {}),
        });
        // Process authentication request
        const response = await fastify.auth.handler(req);

        // Log response details for debugging
        const bodyText = await response.text();
        fastify.log.info(
          {
            url: request.url,
            status: response.status,
            bodyLength: bodyText.length,
            body: bodyText.substring(0, 200),
            headers: Object.fromEntries(response.headers),
          },
          "Auth response",
        );

        // Forward response to client
        reply.status(response.status);
        response.headers.forEach((value: string, key: string) =>
          reply.header(key, value),
        );
        reply.send(bodyText || null);
      } catch (error: any) {
        fastify.log.error("Authentication Error:", error);
        reply.status(500).send({
          error: error.message || "Internal Server Error",
          code: "AUTH_FAILURE",
        });
      }
    },
  });
};
export default authRoutes;
