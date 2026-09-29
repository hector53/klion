import { Module, OnModuleInit, Logger } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";
import { InjectDataSource } from "@nestjs/typeorm";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get("DATABASE_HOST", "localhost"),
        port: configService.get("DATABASE_PORT", 5432),
        username: configService.get("DATABASE_USER", "postgres"),
        password: configService.get("DATABASE_PASSWORD", "postgres"),
        database: configService.get("DATABASE_NAME", "clientboard"),
        entities: [__dirname + "/../**/*.entity{.ts,.js}"],
        synchronize: configService.get("NODE_ENV") === "development",
        logging: configService.get("NODE_ENV") === "development",
      }),
    }),
  ],
})
export class DatabaseModule implements OnModuleInit {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async onModuleInit() {
    await this.enablePgVector();
  }

  /**
   * Enable pgvector extension for vector similarity search
   * Required for Knowledge Base and RAG features
   */
  private async enablePgVector(): Promise<void> {
    try {
      // Check if pgvector extension exists
      const result = await this.dataSource.query(
        `SELECT extname FROM pg_extension WHERE extname = 'vector'`,
      );

      if (result.length === 0) {
        // Try to create the extension
        await this.dataSource.query("CREATE EXTENSION IF NOT EXISTS vector");
        this.logger.log("pgvector extension enabled successfully");
      } else {
        this.logger.log("pgvector extension already enabled");
      }
    } catch (error) {
      this.logger.warn(
        "Could not enable pgvector extension. Vector search features will not be available.",
      );
      this.logger.warn(
        "To install pgvector, see: https://github.com/pgvector/pgvector#installation",
      );
      this.logger.debug(error.message);
    }
  }
}
