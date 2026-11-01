import { IsBoolean } from 'class-validator';

export class BlockCustomerDto {
  @IsBoolean() blocked: boolean;
}
