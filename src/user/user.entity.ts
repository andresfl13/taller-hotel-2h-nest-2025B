import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Booking } from '../booking/booking.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column()
  name: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  phone: string;

  // [BUG 5 - CORREGIDO] SQLite no soporta type: 'timestamp' (la app ni arrancaba).
  // @CreateDateColumn funciona en cualquier BD y se llena sola al insertar.
  @CreateDateColumn()
  createdAt: Date;

  // [BUG 2 - CORREGIDO] Se pedía cascade en el OneToMany. `cascade: true` propaga
  // operaciones de TypeORM (guardar/borrar) desde el usuario hacia sus reservas.
  // Ojo: el borrado "real" en la base de datos lo hace onDelete: 'CASCADE' de
  // Booking.user (lado ManyToOne); ambos se complementan.
  @OneToMany(() => Booking, (booking) => booking.user, { cascade: true })
  bookings: Booking[];
}
