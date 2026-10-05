import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Not } from 'typeorm';
import { Booking } from './booking.entity';
import { Room } from '../room/room.entity';
import { CreateBookingDto } from './dto/create-booking.dto';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private bookingsRepository: Repository<Booking>,
    // Repositorio de Room para leer el precio por noche. Es @Optional() porque los tests
    // unitarios (booking.service.spec.ts) solo proveen el repositorio de Booking; sin
    // @Optional Nest fallaría al inyectar. En la app real siempre está disponible
    // (BookingModule registra Room en forFeature).
    @Optional()
    @InjectRepository(Room)
    private roomsRepository?: Repository<Room>,
  ) {}

  async create(userId: number, createBookingDto: CreateBookingDto): Promise<Booking> {
    // Por HTTP las fechas llegan como string; las convertimos a Date para poder compararlas.
    const checkInDate = new Date(createBookingDto.checkInDate);
    const checkOutDate = new Date(createBookingDto.checkOutDate);

    // Regla de negocio 1: la salida debe ser posterior a la entrada (400 si no).
    if (checkOutDate <= checkInDate) {
      throw new BadRequestException('checkOutDate must be after checkInDate');
    }

    // Regla de negocio 2: la habitación no puede estar ya reservada en esas fechas.
    const hasConflict = await this.hasDateConflict(
      createBookingDto.roomId,
      checkInDate,
      checkOutDate,
    );
    if (hasConflict) {
      throw new BadRequestException('Room is already booked for those dates');
    }

    // Cálculo del precio total = noches * precio por noche de la habitación.
    let totalPrice = 0;
    if (this.roomsRepository) {
      const room = await this.roomsRepository.findOne({
        where: { id: createBookingDto.roomId },
      });
      if (!room) {
        throw new NotFoundException(`Room with id ${createBookingDto.roomId} not found`);
      }
      const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / MS_PER_DAY);
      // Las columnas 'decimal' pueden volver como string desde la BD -> Number()
      totalPrice = nights * Number(room.pricePerNight);
    }

    // [BUG 4 - CORREGIDO] Se pasaba `roomId: ...`, pero la entidad Booking NO tiene esa
    // propiedad: tiene la relación `room`. Hay que asignarla como objeto { id }.
    // Además NO se hace ...createBookingDto porque traería roomId (propiedad inexistente
    // en la entidad) y fechas en string.
    const booking = this.bookingsRepository.create({
      checkInDate,
      checkOutDate,
      room: { id: createBookingDto.roomId },
      user: { id: userId },
      status: 'pending',
      totalPrice,
    });

    return this.bookingsRepository.save(booking);
  }

  async findOne(id: number): Promise<Booking> {
    const booking = await this.bookingsRepository.findOne({
      where: { id },
      relations: ['room', 'user'],
    });

    if (!booking) {
      throw new NotFoundException(`Booking with id ${id} not found`);
    }

    return booking;
  }

  async findByUser(userId: number): Promise<Booking[]> {
    return this.bookingsRepository.find({
      where: { user: { id: userId } },
      relations: ['room', 'user'],
    });
  }

  async findByRoom(roomId: number): Promise<Booking[]> {
    return this.bookingsRepository.find({
      where: { room: { id: roomId } },
      relations: ['room', 'user'],
    });
  }

  // "Cancelar" NO borra la fila: solo cambia el estado (queda el historial).
  // findOne lanza 404 si no existe, y se vuelve a leer para devolver el estado nuevo.
  async cancel(id: number): Promise<Booking> {
    await this.findOne(id);
    await this.bookingsRepository.update(id, { status: 'cancelled' });
    return this.findOne(id);
  }

  // Dos rangos [a1,a2) y [b1,b2) se traslapan si a1 < b2 Y a2 > b1.
  // Aquí: reserva.checkIn < nuevoCheckOut Y reserva.checkOut > nuevoCheckIn.
  // Las reservas canceladas no cuentan (Not('cancelled')).
  async hasDateConflict(
    roomId: number,
    checkInDate: Date,
    checkOutDate: Date,
  ): Promise<boolean> {
    const conflicts = await this.bookingsRepository.find({
      where: {
        room: { id: roomId },
        status: Not('cancelled'),
        checkInDate: LessThan(checkOutDate),
        checkOutDate: MoreThan(checkInDate),
      },
    });

    return !!conflicts && conflicts.length > 0;
  }

  // Todas las reservas que tocan el rango [startDate, endDate] (mismo criterio de traslape).
  async getBookingsByDateRange(startDate: Date, endDate: Date): Promise<Booking[]> {
    return this.bookingsRepository.find({
      where: {
        checkInDate: LessThan(endDate),
        checkOutDate: MoreThan(startDate),
      },
      relations: ['room', 'user'],
    });
  }
}
