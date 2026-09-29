import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { SpacesService } from "./spaces.service";
import { CreateSpaceDto, UpdateSpaceDto } from "./dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@Controller("spaces")
@UseGuards(JwtAuthGuard)
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  /**
   * Create a new space
   */
  @Post()
  async create(
    @CurrentUser("id") userId: string,
    @Body() createSpaceDto: CreateSpaceDto,
  ) {
    const space = await this.spacesService.create(userId, createSpaceDto);
    return {
      success: true,
      message: `Space "${space.name}" created successfully`,
      space,
    };
  }

  /**
   * Get all spaces for the current user
   */
  @Get()
  async findAll(
    @CurrentUser("id") userId: string,
    @Query("includeArchived") includeArchived?: string,
  ) {
    const spaces = await this.spacesService.findAll(
      userId,
      includeArchived === "true",
    );
    return {
      success: true,
      count: spaces.length,
      spaces,
    };
  }

  /**
   * Get a single space by ID
   */
  @Get(":id")
  async findOne(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const space = await this.spacesService.findOne(id, userId);
    return {
      success: true,
      space,
    };
  }

  /**
   * Get space statistics
   */
  @Get(":id/stats")
  async getStats(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const result = await this.spacesService.getStats(id, userId);
    return {
      success: true,
      ...result,
    };
  }

  /**
   * Update a space
   */
  @Patch(":id")
  async update(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateSpaceDto: UpdateSpaceDto,
  ) {
    const space = await this.spacesService.update(id, userId, updateSpaceDto);
    return {
      success: true,
      message: `Space "${space.name}" updated successfully`,
      space,
    };
  }

  /**
   * Archive a space
   */
  @Patch(":id/archive")
  async archive(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const space = await this.spacesService.archive(id, userId);
    return {
      success: true,
      message: `Space "${space.name}" archived successfully`,
      space,
    };
  }

  /**
   * Unarchive a space
   */
  @Patch(":id/unarchive")
  async unarchive(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const space = await this.spacesService.unarchive(id, userId);
    return {
      success: true,
      message: `Space "${space.name}" unarchived successfully`,
      space,
    };
  }

  /**
   * Reorder spaces
   */
  @Patch("reorder")
  async reorder(
    @CurrentUser("id") userId: string,
    @Body("spaceIds") spaceIds: string[],
  ) {
    const spaces = await this.spacesService.reorder(userId, spaceIds);
    return {
      success: true,
      message: "Spaces reordered successfully",
      spaces,
    };
  }

  /**
   * Delete a space (only if empty)
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    await this.spacesService.remove(id, userId);
  }

  /**
   * Create default spaces for the user (useful for onboarding)
   */
  @Post("defaults")
  async createDefaults(@CurrentUser("id") userId: string) {
    const spaces = await this.spacesService.createDefaultSpaces(userId);
    return {
      success: true,
      message: "Default spaces created successfully",
      spaces,
    };
  }
}
