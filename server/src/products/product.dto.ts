import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

class VariantDto {
  @IsString() @IsNotEmpty() @MaxLength(60) name: string;
  @IsString() img: string;
}

export class UpdateProductDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(160) name?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(60) cat?: string;
  @IsOptional() @IsInt() @Min(0) price?: number;
  @IsOptional() @IsInt() @Min(0) market?: number;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(30) country?: string;
  @IsOptional() @IsString() img?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(40) @ValidateNested({ each: true }) @Type(() => VariantDto) variants?: VariantDto[];
  @IsOptional() @IsString() @MaxLength(20) vlabel?: string;
  @IsOptional() @ValidateIf((o: UpdateProductDto) => !!o.link) @IsUrl({ protocols: ['https'], require_protocol: true }, { message: 'Link phải bắt đầu bằng https://' }) link?: string;
  @IsOptional() @IsBoolean() hot?: boolean;
  @IsOptional() @IsBoolean() best?: boolean;
  @IsOptional() @IsBoolean() soldout?: boolean;
}

export class CreateProductDto extends UpdateProductDto {
  @IsOptional() @Matches(/^[a-z0-9_-]{1,40}$/i) id?: string;
  @IsString() @IsNotEmpty() @MaxLength(160) declare name: string;
}
