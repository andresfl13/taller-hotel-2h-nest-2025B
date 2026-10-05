import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateHotelDto {
  // 1) Obligatorio. @IsNotEmpty rechaza '', null y undefined.
  @IsNotEmpty()
  @IsString()
  name: string;

  // 2) Obligatorio
  @IsNotEmpty()
  @IsString()
  location: string;

  // En la entidad city/country son nullable, por eso aquí son opcionales
  @IsOptional()
  @IsString()
  city: string;

  @IsOptional()
  @IsString()
  country: string;

  // 3) y 4) Rango permitido 0..5 (rating 6.5 -> 400). @IsNumber asegura que sea número.
  @IsNumber()
  @Min(0)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  description?: string;
}
