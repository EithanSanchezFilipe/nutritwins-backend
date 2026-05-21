import { buildApp } from "./app";

async function start() {
  const app = await buildApp();

  try {
    await app.listen({
      port: Number(process.env.PORT) || 3000,
      host: "0.0.0.0",
    });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const closeApp = async (signal: string) => {
    app.log.info(`Received ${signal}`);
    await app.close();
    process.exit(0);
  };

  process.on("SIGINT", closeApp);
  process.on("SIGTERM", closeApp);
}

start();
