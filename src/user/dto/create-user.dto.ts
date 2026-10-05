import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

// [TALLER] Un DTO (Data Transfer Object) describe la forma del body que acepta el endpoint.
// Los decoradores de class-validator se ejecutan SOLO si hay un ValidationPipe activo (main.ts).
// Con whitelist/forbidNonWhitelisted TODA propiedad necesita al menos un decorador,
// por eso hasta el campo opcional (phone) lleva @IsOptional + @IsString.
export class CreateUserDto {
  // 1) Formato de correo válido (falla con 'invalid-email' o con un número)
  @IsEmail()
  email: string;

  // 2) y 3) Contraseña obligatoria y de mínimo 6 caracteres ('123' -> 400)
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  // 4) Nombre obligatorio
  @IsNotEmpty()
  name: string;

  // Opcional: si no viene se omite; si viene debe ser string
  @IsOptional()
  @IsString()
  phone?: string;
}
