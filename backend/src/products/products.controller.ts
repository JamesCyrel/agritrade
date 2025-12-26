
import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('api/farmer/products')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('FARMER')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @Post()
    async createProduct(@Request() req, @Body() body: any) {
        try {
            const product = await this.productsService.create(req.user.userId, body);
            return { success: true, message: 'Product created successfully', data: product };
        } catch (error) {
            throw new BadRequestException(error.message || 'Failed to create product');
        }
    }

    @Get()
    async getProducts(@Request() req, @Query('includeInactive') includeInactive: string) {
        const products = await this.productsService.findByFarmerId(req.user.userId, includeInactive === 'true');
        return { success: true, data: products };
    }

    @Get('archived/list')
    async getArchivedProducts(@Request() req) {
        const products = await this.productsService.findArchivedByFarmerId(req.user.userId);
        return { success: true, data: products };
    }

    @Get(':productId')
    async getProduct(@Request() req, @Param('productId') productId: number) {
        const product = await this.productsService.findById(productId);
        if (!product) {
            throw new NotFoundException('Product not found');
        }
        if (product.farmer_id !== req.user.userId) {
            throw new ForbiddenException('Access denied');
        }
        return { success: true, data: product };
    }

    @Put(':productId')
    async updateProduct(@Request() req, @Param('productId') productId: number, @Body() body: any) {
        const existing = await this.productsService.findById(productId);
        if (!existing) throw new NotFoundException('Product not found');
        if (existing.farmer_id !== req.user.userId) throw new ForbiddenException('Access denied');

        try {
            const product = await this.productsService.update(productId, req.user.userId, body);
            return { success: true, message: 'Product updated successfully', data: product };
        } catch (error) {
            throw new BadRequestException(error.message || 'Failed to update product');
        }
    }

    @Post(':productId/archive')
    async archiveProduct(@Request() req, @Param('productId') productId: number) {
        const result = await this.productsService.archive(productId, req.user.userId);
        if (!result) throw new NotFoundException('Product not found');
        return { success: true, message: 'Product archived successfully' };
    }

    @Post(':productId/unarchive')
    async unarchiveProduct(@Request() req, @Param('productId') productId: number) {
        const result = await this.productsService.unarchive(productId, req.user.userId);
        if (!result) throw new NotFoundException('Product not found or not archived');
        return { success: true, message: 'Product unarchived successfully' };
    }

    @Put(':productId/inventory')
    async updateInventory(@Request() req, @Param('productId') productId: number, @Body() body: any) {
        const { available_quantity } = body;
        const result = await this.productsService.updateInventory(productId, req.user.userId, parseFloat(available_quantity));
        if (!result) throw new NotFoundException('Product not found or access denied');
        return { success: true, message: 'Inventory updated successfully', data: result };
    }
}
