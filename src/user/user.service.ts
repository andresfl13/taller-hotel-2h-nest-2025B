import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    // Inyecta el Repository<User> (acceso a la tabla). Requiere TypeOrmModule.forFeature([User])
    // en user.module.ts.
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      // [BUG 3 - CORREGIDO] Era NotFoundException (404). Un email repetido es un
      // conflicto con el estado actual -> ConflictException (409). Elegir la excepción
      // por el significado: 400 BadRequest, 401 Unauthorized, 404 NotFound, 409 Conflict.
      throw new ConflictException('Email already in use');
    }

    // Nunca se guarda la contraseña en texto plano: bcrypt genera un hash (10 = rondas de sal)
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return this.usersRepository.save(user);
  }

  // findOne de TypeORM devuelve `User | null`. Con strictNullChecks el tipo de retorno
  // debe admitir null; si no, TypeScript no compila.
  async findOne(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
    });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
    });
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  // repository.delete(id) ejecuta un DELETE directo y devuelve { affected: n }.
  // affected === 0 significa que ese id no existía -> 404.
  async delete(id: number): Promise<boolean> {
    const result = await this.usersRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return true;
  }
}
