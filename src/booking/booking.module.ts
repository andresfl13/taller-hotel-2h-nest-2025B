import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { Booking } from './booking.entity';
import { Room } from '../room/room.entity';

@Module({
  // forFeature registra los repositorios que este módulo puede inyectar.
  // Se agrega Room porque BookingService lo usa para calcular el precio.
  imports: [TypeOrmModule.forFeature([Booking, Room])],
  providers: [BookingService],
  controllers: [BookingController],
  exports: [BookingService],
})
export class BookingModule {}
