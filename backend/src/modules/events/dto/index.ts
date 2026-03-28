import { IsString, IsInt, Min } from 'class-validator';

export class CreateEventDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  totalCapacity: number;
}

export class UpdateCapacityDto {
  @IsInt()
  @Min(1)
  totalCapacity: number;
}
