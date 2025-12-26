
import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ConsumerService } from './consumer.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ProductsService } from '../products/products.service';

@Controller('api/consumer')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('CONSUMER')
export class ConsumerController {
    constructor(
        private readonly consumerService: ConsumerService,
        private readonly productsService: ProductsService
    ) { }

    @Get('profile')
    async getProfile(@Request() req) {
        const profile = await this.consumerService.getProfile(req.user.userId);
        return { success: true, data: profile };
    }

    @Put('profile')
    async updateProfile(@Request() req, @Body() body: any) {
        const { full_name } = body;
        if (!full_name) throw new BadRequestException('Full name is required');
        const profile = await this.consumerService.updateProfile(req.user.userId, full_name);
        return { success: true, message: 'Profile updated', data: profile };
    }

    @Get('products/search')
    async searchProducts(@Query() query: any) {
        // TODO: Implement full search logic in ProductsService or here
        // For now returning basic list or implement search method in ProductsService
        return { success: true, message: 'Search functionality pending implementation in ProductsService' };
    }

    @Get('homepage')
    async getHomepage() {
        // TODO: Implement homepage data in ProductsService
        return { success: true, message: 'Homepage data pending implementation' };
    }
}
