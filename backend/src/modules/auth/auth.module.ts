import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtOrServiceKeyGuard } from './guards/jwt-or-service-key.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET', 'klion-secret-key-2024'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtOrServiceKeyGuard],
  // UsersModule is re-exported because @UseGuards(JwtOrServiceKeyGuard) makes
  // Nest build the guard in the *consuming* module's context, where it still
  // needs UsersService to resolve service keys to the single user.
  exports: [AuthService, JwtModule, JwtOrServiceKeyGuard, UsersModule],
})
export class AuthModule {}
