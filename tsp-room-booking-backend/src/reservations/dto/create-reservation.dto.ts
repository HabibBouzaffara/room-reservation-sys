import { IsDateString, IsNotEmpty, MinLength } from 'class-validator';

export class CreateReservationDto {
  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsNotEmpty()
  @MinLength(3)
  activity: string;

  @IsNotEmpty()
  hardware: string;

  @IsNotEmpty()
  software: string;
}
