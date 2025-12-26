
import { Module } from '@nestjs/common';
import { FarmersService } from './farmers.service';
import { FarmersController } from './farmers.controller';

@Module({
    controllers: [FarmersController],
    providers: [FarmersService],
    exports: [FarmersService],
})
export class FarmersModule { }
