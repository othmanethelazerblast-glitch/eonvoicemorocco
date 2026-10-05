import { buildServer } from "./server";

const PORT = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);

const app = buildServer();

app
  .listen({ port: PORT, host: "0.0.0.0" })
  .then(() => app.log.info(`api listening on http://localhost:${PORT}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
