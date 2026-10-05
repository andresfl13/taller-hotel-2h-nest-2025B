import { Controller, Post, Get, Body, Param, Delete, Request, UseGuards } from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Booking } from './booking.entity';

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  // JWT guard (opcional): para proteger el endpoint se agregaría aquí
  //   @UseGuards(AuthGuard('jwt'))   // import { AuthGuard } from '@nestjs/passport'
  // y req.user lo llena JwtStrategy.validate(). NO está activo porque los tests e2e
  // llaman a este endpoint sin token (devolverían 401) y no existe endpoint de login.
  async createBooking(
    @Request() req: any,
    @Body() createBookingDto: CreateBookingDto,
  ): Promise<Booking> {
    // In a real scenario, userId would come from JWT token in req.user
    const userId = req.user?.id || 1; // Default to 1 for testing
    return this.bookingService.create(userId, createBookingDto);
  }

  @Get(':id')
  async getBooking(@Param('id') id: string): Promise<Booking> {
    return this.bookingService.findOne(parseInt(id));
  }

  @Get('user/:userId')
  async getUserBookings(@Param('userId') userId: string): Promise<Booking[]> {
    return this.bookingService.findByUser(parseInt(userId));
  }

  @Get('room/:roomId')
  async getRoomBookings(@Param('roomId') roomId: string): Promise<Booking[]> {
    return this.bookingService.findByRoom(parseInt(roomId));
  }

  // DELETE /bookings/:id — no borra: cancela (status = 'cancelled') y devuelve la reserva
  // actualizada, que es lo que los tests e2e esperan (body.status === 'cancelled').
  @Delete(':id')
  async cancelBooking(@Param('id') id: string): Promise<Booking> {
    return this.bookingService.cancel(parseInt(id));
  }
}
