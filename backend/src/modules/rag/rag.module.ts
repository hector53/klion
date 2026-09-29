import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CodeChunk } from './entities/code-chunk.entity';
import { Project } from '../projects/entities/project.entity';
import { ProjectContext } from '../projects/entities/project-context.entity';
import { RagController } from './rag.controller';
import { RagService } from './services/rag.service';
import { EmbeddingService } from './services/embedding.service';
import { IndexerService } from './services/indexer.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CodeChunk, Project, ProjectContext]),
    ConfigModule,
  ],
  controllers: [RagController],
  providers: [RagService, EmbeddingService, IndexerService],
  exports: [RagService, EmbeddingService],
})
export class RagModule {}
