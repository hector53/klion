import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { json, urlencoded } from "express";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Increase body size limit for RAG chunk uploads (default is 100KB)
  app.use(json({ limit: "10mb" }));
  app.use(urlencoded({ extended: true, limit: "10mb" }));

  // Legacy redirect: /uploads/:file -> /api/files/serve/:file
  app.use("/uploads", (req: any, res: any) => {
    res.redirect(301, `/api/files/serve${req.url}`);
  });

  // Global prefix
  app.setGlobalPrefix("api");

  // CORS - permitir múltiples orígenes
  app.enableCors({
    origin: (
      process.env.FRONTEND_URL ||
      "http://localhost:3000,http://localhost:3500,http://localhost:3002"
    ).split(","),
    credentials: true,
  });

  // Validation pipe global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle("Klion API")
    .setDescription("API para gestión de clientes y tareas")
    .setVersion("1.0")
    .addBearerAuth()
    .addApiKey(
      { type: "apiKey", name: "X-Service-Key", in: "header" },
      "service-key",
    )
    .addTag("clients", "Gestión de clientes")
    .addTag("tasks", "Gestión de tareas")
    .addTag("worklogs", "Registro de trabajo")
    .addTag("files", "Archivos y enlaces")
    .addTag("snapshots", "Snapshots del board")
    .addTag("ai", "Asistente de IA")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 Klion API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
