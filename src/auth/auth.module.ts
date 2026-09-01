import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsuariosModule } from '../usuarios/usuarios.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    UsuariosModule, // fornece UsuariosRepository e UsuariosService
    // Segredo e expiracao sao passados no signAsync, por isso vai vazio aqui
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
