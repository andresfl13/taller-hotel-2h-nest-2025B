import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateRoomDto {
  // 1) Obligatorio
  @IsNotEmpty()
  @IsString()
  roomNumber: string;

  // 2) Solo se aceptan estos tres valores
  @IsIn(['single', 'double', 'suite'])
  type: string; // 'single', 'double', 'suite'

  // 3) Precio mínimo 0.01 (negativo o 0 -> 400)
  @IsNumber()
  @Min(0.01)
  pricePerNight: number;

  // 4) Al menos una persona
  @IsNumber()
  @Min(1)
  capacity: number;

  @IsOptional()
  @IsString()
  description?: string;
}
