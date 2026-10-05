import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // [TALLER] Sin esta línea los decoradores de los DTO (@IsEmail, @Min...) NO se ejecutan:
  // el body entra tal cual y se guarda cualquier cosa.
  //  - whitelist: elimina del body las propiedades que no tengan ningún decorador en el DTO.
  //  - forbidNonWhitelisted: en vez de ignorarlas, responde 400 si llegan propiedades extra.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
