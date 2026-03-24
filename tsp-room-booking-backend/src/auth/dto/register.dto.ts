import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export class RegisterDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;


  @IsEnum(UserRole)
  role: UserRole;
}
