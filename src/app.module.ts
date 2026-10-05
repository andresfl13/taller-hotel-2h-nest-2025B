import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';
import { HotelModule } from './hotel/hotel.module';
import { RoomModule } from './room/room.module';
import { BookingModule } from './booking/booking.module';
import { AuthModule } from './auth/auth.module';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      // [TALLER] Jest define NODE_ENV='test' automáticamente. Usamos una BD en memoria
      // para los tests e2e: así cada corrida empieza limpia y no choca con datos viejos
      // (ej: el email 'newuser@example.com' ya registrado de una ejecución anterior).
      database: process.env.NODE_ENV === 'test' ? ':memory:' : 'database.sqlite',
      // Busca TODAS las entidades (*.entity.ts / *.entity.js) en el proyecto.
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      // Crea/actualiza las tablas solas a partir de las entidades (solo para desarrollo).
      synchronize: true,
    }),
    UserModule,
    HotelModule,
    RoomModule,
    // [BUG] BookingModule no estaba importado: sus endpoints (/bookings) nunca existían
    // (404) aunque el controller y el service estuvieran bien escritos.
    // Regla: todo módulo nuevo DEBE listarse aquí o no se registra en la app.
    BookingModule,
    AuthModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
