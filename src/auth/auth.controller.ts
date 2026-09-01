import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  registrarSchema,
  loginSchema,
  RegistrarDto,
  LoginDto,
} from './dto/auth.schemas';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, UsuarioAutenticado } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usuariosService: UsuariosService,
  ) {}

  @Post('register')
  registrar(
    @Body(new ZodValidationPipe(registrarSchema)) dto: RegistrarDto,
  ) {
    return this.authService.registrar(dto);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Protegida: precisa de um token valido para deslogar aquele usuario
  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.authService.logout(usuario.id);
  }

  // Util para o app validar o token e buscar os dados do usuario logado
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.usuariosService.verPerfil(usuario.id);
  }
}
