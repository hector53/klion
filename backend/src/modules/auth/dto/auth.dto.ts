import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  name: string;
}

export class AuthResponseDto {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    role: string;
  };
}
