import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import * as path from "path";

// Cargar variables de entorno desde .env o el entorno de Docker
dotenv.config();

// En producción (contenedor Docker):
//   - cwd es /app
//   - este archivo está en /app/dist/database/data-source.js
//   - las entidades están en /app/dist/**/*.entity.js
// En desarrollo:
//   - ejecutamos desde backend/
//   - este archivo está en src/database/data-source.ts
//   - las entidades están en src/**/*.entity.ts
const isProduction = process.env.NODE_ENV === "production";

// __dirname en producción será /app/dist/database
// __dirname en desarrollo será /path/to/backend/src/database
const entitiesPath = isProduction
  ? path.join(__dirname, "../**/*.entity.js") // Desde dist/database -> dist/**/*.entity.js
  : path.join(__dirname, "../**/*.entity.ts"); // Desde src/database -> src/**/*.entity.ts

const migrationsPath = isProduction
  ? path.join(__dirname, "../migrations/*.js")
  : path.join(__dirname, "../migrations/*.ts");

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DATABASE_HOST || "localhost",
  port: parseInt(process.env.DATABASE_PORT || "5432", 10),
  username: process.env.DATABASE_USER || "postgres",
  password: process.env.DATABASE_PASSWORD || "postgres",
  database: process.env.DATABASE_NAME || "clientboard",
  synchronize: false, // ¡NUNCA USAR true EN PRODUCCIÓN PARA MIGRACIONES!
  logging: process.env.NODE_ENV !== "production",
  entities: [entitiesPath],
  migrations: [migrationsPath],
  subscribers: [],
});

// Este AppDataSource se utilizará para las operaciones de la CLI de TypeORM.
