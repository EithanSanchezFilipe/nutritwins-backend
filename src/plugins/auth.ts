import fp from "fastify-plugin";
import auth from "../lib/auth";

export default fp(async (fastify) => {
  fastify.decorate("auth", auth(fastify.prisma));
});
