import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { Hotel } from './hotel.entity';
import { CreateHotelDto } from './dto/create-hotel.dto';

@Injectable()
export class HotelService {
  constructor(
    @InjectRepository(Hotel)
    private hotelsRepository: Repository<Hotel>,
  ) {}

  async create(createHotelDto: CreateHotelDto): Promise<Hotel> {
    const hotel = this.hotelsRepository.create(createHotelDto);
    return this.hotelsRepository.save(hotel);
  }

  async findAll(): Promise<Hotel[]> {
    return this.hotelsRepository.find({ relations: ['rooms'] });
  }

  async findOne(id: number): Promise<Hotel> {
    const hotel = await this.hotelsRepository.findOne({
      where: { id },
      relations: ['rooms'],
    });

    if (!hotel) {
      throw new NotFoundException(`Hotel with id ${id} not found`);
    }

    return hotel;
  }

  // Busca por texto parcial en location O en city. Pasar un ARRAY a `where` equivale a OR;
  // un objeto con varias claves equivale a AND. Like('%x%') = "contiene x"
  // (en SQLite LIKE no distingue mayúsculas).
  async searchByLocation(location: string): Promise<Hotel[]> {
    return this.hotelsRepository.find({
      where: [
        { location: Like(`%${location}%`) },
        { city: Like(`%${location}%`) },
      ],
      relations: ['rooms'],
    });
  }

  // Hoteles que tienen AL MENOS una habitación disponible. Filtrar por una relación
  // (rooms: { available: true }) hace un JOIN; las rooms devueltas son solo las disponibles.
  async getAvailableHotels(): Promise<Hotel[]> {
    return this.hotelsRepository.find({
      where: { rooms: { available: true } },
      relations: ['rooms'],
    });
  }

  // Patrón UPDATE: 1) repository.update(id, datos) -> { affected }, 2) si affected === 0
  // el id no existe -> 404, 3) releer con findOne para devolver el registro ya actualizado.
  async update(id: number, updateData: Partial<CreateHotelDto>): Promise<Hotel> {
    const result = await this.hotelsRepository.update(id, updateData);

    if (result.affected === 0) {
      throw new NotFoundException(`Hotel with id ${id} not found`);
    }

    return this.findOne(id);
  }

  // Patrón DELETE: repository.delete(id) y revisar affected para saber si existía.
  // Las habitaciones del hotel se borran solas por el onDelete: 'CASCADE' de Room.hotel.
  async delete(id: number): Promise<boolean> {
    const result = await this.hotelsRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Hotel with id ${id} not found`);
    }

    return true;
  }
}
