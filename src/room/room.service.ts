import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from './room.entity';
import { CreateRoomDto } from './dto/create-room.dto';

@Injectable()
export class RoomService {
  constructor(
    @InjectRepository(Room)
    private roomsRepository: Repository<Room>,
  ) {}

  async create(hotelId: number, createRoomDto: CreateRoomDto): Promise<Room> {
    // `hotel: { id }` es la forma de asignar una relación ManyToOne sin cargar el hotel:
    // TypeORM solo necesita el id para llenar la columna hotelId.
    const room = this.roomsRepository.create({
      ...createRoomDto,
      hotel: { id: hotelId },
    });

    return this.roomsRepository.save(room);
  }

  async findAll(hotelId: number): Promise<Room[]> {
    return this.roomsRepository.find({
      where: { hotel: { id: hotelId } },
    });
  }

  async findOne(id: number): Promise<Room> {
    const room = await this.roomsRepository.findOne({
      where: { id },
      relations: ['hotel', 'bookings'],
    });

    if (!room) {
      throw new NotFoundException(`Room with id ${id} not found`);
    }

    return room;
  }

  // Habitaciones de un hotel marcadas como disponibles (campo booleano `available`).
  async getAvailability(hotelId: number): Promise<Room[]> {
    return this.roomsRepository.find({
      where: { hotel: { id: hotelId }, available: true },
    });
  }

  // ¿Se puede reservar la habitación entre startDate y endDate?
  // Hay choque con una reserva existente si: existente.checkIn < nuevoFin Y existente.checkOut > nuevoInicio.
  // (Si una termina el mismo día que otra empieza NO choca: por eso < y > estrictos.)
  // Las reservas canceladas se ignoran.
  async isAvailableForDateRange(
    roomId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<boolean> {
    const room = await this.roomsRepository.findOne({
      where: { id: roomId },
      relations: ['bookings'],
    });

    if (!room) {
      throw new NotFoundException(`Room with id ${roomId} not found`);
    }

    if (!room.available) {
      return false;
    }

    const hasConflict = (room.bookings ?? []).some(
      (booking) =>
        booking.status !== 'cancelled' &&
        new Date(booking.checkInDate) < endDate &&
        new Date(booking.checkOutDate) > startDate,
    );

    return !hasConflict;
  }

  async update(id: number, updateData: Partial<CreateRoomDto> & { available?: boolean }): Promise<Room> {
    const result = await this.roomsRepository.update(id, updateData);

    if (result.affected === 0) {
      throw new NotFoundException(`Room with id ${id} not found`);
    }

    return this.findOne(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.roomsRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Room with id ${id} not found`);
    }

    return true;
  }
}
