import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { Hotel } from '../hotel/hotel.entity';
import { Booking } from '../booking/booking.entity';

@Entity()
export class Room {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  roomNumber: string;

  @Column()
  type: string; // 'single', 'double', 'suite'

  @Column('decimal', { precision: 10, scale: 2 })
  pricePerNight: number;

  @Column()
  capacity: number;

  @Column({ default: true })
  available: boolean;

  @Column({ nullable: true })
  description: string;

  // [BUG 5 - CORREGIDO] SQLite no soporta type: 'timestamp' (la app ni arrancaba).
  // @CreateDateColumn funciona en cualquier BD y se llena sola al insertar.
  @CreateDateColumn()
  createdAt: Date;

  // Muchas habitaciones -> un hotel. El 2º argumento es el "lado inverso" (hotel.rooms).
  // onDelete CASCADE: si se borra el hotel, se borran sus habitaciones.
  @ManyToOne(() => Hotel, (hotel) => hotel.rooms, { onDelete: 'CASCADE' })
  hotel: Hotel;

  // Una habitación -> muchas reservas. (booking) => booking.room es el lado inverso
  // y ya estaba bien declarado; el comentario original del taller era una pista falsa.
  // OneToMany NO crea columna: la FK vive en Booking.room.
  @OneToMany(() => Booking, (booking) => booking.room)
  bookings: Booking[];
}
