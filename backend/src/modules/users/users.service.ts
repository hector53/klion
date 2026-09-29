import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Verificar si el email ya existe
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Hash del password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      select: ['id', 'email', 'name', 'avatar', 'role', 'isActive', 'createdAt'],
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: ['id', 'email', 'name', 'avatar', 'role', 'isActive', 'createdAt'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
    });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password', 'name', 'avatar', 'role', 'isActive'],
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: ['id', 'password'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new ConflictException('Contraseña actual incorrecta');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.update(id, { password: hashedPassword });
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmailWithPassword(email);
    
    if (!user || !user.isActive) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async createMasterUser(): Promise<User | null> {
    const masterEmail = process.env.MASTER_USER_EMAIL || 'demo@klion.local';
    const existingUser = await this.findByEmail(masterEmail);
    
    if (existingUser) {
      return existingUser;
    }

    const masterPassword = process.env.MASTER_USER_PASSWORD;
    if (!masterPassword) {
      throw new Error('MASTER_USER_PASSWORD must be configured before creating the first user');
    }

    // Crear usuario master si no existe
    const masterUser = await this.create({
      email: masterEmail,
      password: masterPassword,
      name: process.env.MASTER_USER_NAME || 'Demo User',
      role: UserRole.ADMIN,
    });

    console.log('🔐 Usuario master creado:', masterEmail);
    return masterUser;
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }
}
