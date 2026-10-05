import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

// DTO de actualización: mismas reglas que CreateRoomDto pero opcionales, más `available`,
// que existe en la entidad pero no se envía al crear. Sin esa propiedad el
// forbidNonWhitelisted rechazaría { available: false } con un 400.
export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  roomNumber?: string;

  @IsOptional()
  @IsIn(['single', 'double', 'suite'])
  type?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  pricePerNight?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  available?: boolean;
}
