import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Room } from '../room/room.entity';

@Entity()
export class Hotel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  location: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  country: string;

  @Column('decimal', { precision: 5, scale: 2 })
  rating: number;

  @Column({ nullable: true })
  description: string;

  // [BUG 5 - CORREGIDO] SQLite no soporta type: 'timestamp' (la app ni arrancaba).
  // @CreateDateColumn funciona en cualquier BD y se llena sola al insertar.
  @CreateDateColumn()
  createdAt: Date;


  @OneToMany(() => Room, (room) => room.hotel)
  rooms: Room[];
}
