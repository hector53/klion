import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsUUID,
  IsObject,
  MaxLength,
} from "class-validator";
import { BooleanQuery } from "../../../common";

export class CreateClientDto {
  @ApiPropertyOptional({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "Space ID",
  })
  @IsOptional()
  @IsUUID()
  spaceId?: string;

  @ApiProperty({ example: "Juan Pérez", description: "Nombre del cliente" })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: "ACME Corp", description: "Empresa" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  company?: string;

  @ApiPropertyOptional({ example: "juan@acme.com" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: "+5491155556666", description: "Teléfono" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ example: "+5491155556666", description: "WhatsApp" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  whatsapp?: string;

  @ApiPropertyOptional({
    example: "Av. Reforma 123, CDMX",
    description: "Dirección",
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    example: "Cliente desde 2023, prefiere comunicación por email",
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    example: { taxId: "RFC123456", paymentTerms: "30 days" },
    description: "Custom metadata fields",
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateClientDto extends PartialType(CreateClientDto) {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ClientFilterDto {
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @BooleanQuery()
  @IsBoolean()
  includeInactive?: boolean;

  @ApiPropertyOptional({ description: "Filtrar por espacio" })
  @IsOptional()
  @IsUUID()
  spaceId?: string;
}

export class ClientResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  spaceId?: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  company?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  whatsapp?: string;

  @ApiPropertyOptional()
  address?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
