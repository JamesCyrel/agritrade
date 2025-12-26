
import { Module } from '@nestjs/common';
import { ConsumerService } from './consumer.service';
import { ConsumerController } from './consumer.controller';
import { ProductsModule } from '../products/products.module';

@Module({
    imports: [ProductsModule],
    controllers: [ConsumerController],
    providers: [ConsumerService],
    exports: [ConsumerService],
})
export class ConsumerModule { }
