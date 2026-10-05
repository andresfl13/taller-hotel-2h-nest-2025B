import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../user/user.entity';
import { Room } from '../room/room.entity';

@Entity()
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  checkInDate: Date;

  @Column()
  checkOutDate: Date;

  @Column({ default: 'pending' })
  status: string; // 'pending', 'confirmed', 'cancelled'

  @Column('decimal', { precision: 10, scale: 2 })
  totalPrice: number;

  // [BUG 5 - CORREGIDO] SQLite no soporta type: 'timestamp' (la app ni arrancaba).
  // @CreateDateColumn funciona en cualquier BD y se llena sola al insertar.
  @CreateDateColumn()
  createdAt: Date;

  // [BUG 1 - CORREGIDO] Faltaba { onDelete: 'CASCADE' }. Sin él, borrar una habitación que
  // tiene reservas falla por la llave foránea (FOREIGN KEY constraint failed).
  // onDelete se escribe en el lado ManyToOne (el que tiene la FK en su tabla).
  @ManyToOne(() => Room, (room) => room.bookings, { onDelete: 'CASCADE' })
  room: Room;

  @ManyToOne(() => User, (user) => user.bookings, { onDelete: 'CASCADE' })
  user: User;
}
