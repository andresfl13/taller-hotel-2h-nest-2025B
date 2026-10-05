import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

// [TALLER] DTO de actualización (PUT): mismas reglas que CreateHotelDto pero TODO opcional,
// porque el cliente puede mandar solo { rating: 4.8 }. @IsOptional() hace que, si el campo
// no viene, se salten el resto de validaciones; si viene, se validan igual (rating: 9 -> 400).
//
// ¿Por qué no `Partial<CreateHotelDto>`? Es solo un tipo de TypeScript: desaparece al
// compilar y el ValidationPipe no valida nada. ¿Y `PartialType` de @nestjs/mapped-types?
// Sería lo ideal (copia los decoradores solo), pero la versión instalada es ESM y Jest no
// la puede cargar, así que se declara a mano.
export class UpdateHotelDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
