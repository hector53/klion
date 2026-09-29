import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { TriggersService } from "./triggers.service";
import { CreateTriggerDto } from "./dto/create-trigger.dto";
import { UpdateTriggerDto } from "./dto/update-trigger.dto";

@Controller("triggers")
@UseGuards(JwtAuthGuard)
export class TriggersController {
  constructor(private readonly triggersService: TriggersService) {}

  @Post()
  async create(
    @CurrentUser("id") userId: string,
    @Body() createTriggerDto: CreateTriggerDto,
  ) {
    const trigger = await this.triggersService.create(userId, createTriggerDto);
    return {
      success: true,
      message: `Trigger "${trigger.name}" created`,
      trigger,
    };
  }

  @Get()
  async findAll(@CurrentUser("id") userId: string) {
    const triggers = await this.triggersService.findAll(userId);
    return { success: true, triggers };
  }

  @Get(":id")
  async findOne(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const trigger = await this.triggersService.findOne(id, userId);
    return { success: true, trigger };
  }

  @Patch(":id")
  async update(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateTriggerDto: UpdateTriggerDto,
  ) {
    const trigger = await this.triggersService.update(
      id,
      userId,
      updateTriggerDto,
    );
    return {
      success: true,
      message: `Trigger "${trigger.name}" updated`,
      trigger,
    };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    await this.triggersService.remove(id, userId);
  }

  @Patch(":id/toggle")
  async toggle(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const trigger = await this.triggersService.toggle(id, userId);
    return {
      success: true,
      message: `Trigger "${trigger.name}" ${trigger.isActive ? "activated" : "deactivated"}`,
      trigger,
    };
  }
}
