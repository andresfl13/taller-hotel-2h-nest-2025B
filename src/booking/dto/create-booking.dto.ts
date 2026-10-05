import { IsDateString, IsInt } from 'class-validator';

// [TALLER] Por HTTP las fechas viajan como string ISO ('2025-06-01T00:00:00.000Z'), por eso
// se usa @IsDateString (valida el texto) y no @IsDate (exigiría un objeto Date, que solo
// existe si activas `transform: true`). El tipo sigue siendo Date para que el service
// y los tests unitarios puedan pasar objetos Date; el service lo normaliza con new Date().
// La regla "checkOut > checkIn" depende de DOS campos, así que se valida en el
// BookingService (BadRequestException) en vez de en el DTO.
export class CreateBookingDto {
  @IsInt()
  roomId: number;

  @IsDateString()
  checkInDate: Date;

  @IsDateString()
  checkOutDate: Date;
}
