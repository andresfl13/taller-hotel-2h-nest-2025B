import { Controller, Post, Get, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { HotelService } from './hotel.service';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { Hotel } from './hotel.entity';

@Controller('hotels')
export class HotelController {
  constructor(private readonly hotelService: HotelService) {}

  @Post()
  async createHotel(@Body() createHotelDto: CreateHotelDto): Promise<Hotel> {
    return this.hotelService.create(createHotelDto);
  }

  @Get()
  async getAllHotels(): Promise<Hotel[]> {
    return this.hotelService.findAll();
  }

  // [IMPORTANTE - ORDEN DE RUTAS] Nest evalúa las rutas en el orden en que están escritas.
  // Si `@Get(':id')` estuviera antes, GET /hotels/search sería capturado por ':id'
  // con id='search' (parseInt -> NaN). Las rutas FIJAS (search, available) van ANTES de las
  // dinámicas (:id).
  // GET /hotels/search?location=Downtown   (@Query lee el query string)
  @Get('search')
  async searchHotels(@Query('location') location: string = ''): Promise<Hotel[]> {
    return this.hotelService.searchByLocation(location);
  }

  // GET /hotels/available
  @Get('available')
  async getAvailableHotels(): Promise<Hotel[]> {
    return this.hotelService.getAvailableHotels();
  }

  @Get(':id')
  async getHotel(@Param('id') id: string): Promise<Hotel> {
    return this.hotelService.findOne(parseInt(id));
  }

  // PUT /hotels/:id — UpdateHotelDto valida los campos opcionales del body
  @Put(':id')
  async updateHotel(
    @Param('id') id: string,
    @Body() updateData: UpdateHotelDto,
  ): Promise<Hotel> {
    return this.hotelService.update(parseInt(id), updateData);
  }

  // DELETE /hotels/:id — el service ya lanza 404 si no existe
  @Delete(':id')
  async deleteHotel(@Param('id') id: string): Promise<{ success: boolean }> {
    const success = await this.hotelService.delete(parseInt(id));
    return { success };
  }
}
