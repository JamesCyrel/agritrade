
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, BadRequestException, NotFoundException } from '@nestjs/common';
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

    // Profile
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

    // Addresses
    @Get('addresses')
    async getAddresses(@Request() req) {
        const addresses = await this.consumerService.getAddresses(req.user.userId);
        return { success: true, data: addresses };
    }

    @Post('addresses')
    async addAddress(@Request() req, @Body() body: any) {
        const address = await this.consumerService.addAddress(req.user.userId, body);
        return { success: true, message: 'Address added', data: address };
    }

    @Put('addresses/:id')
    async updateAddress(@Request() req, @Param('id') id: string, @Body() body: any) {
        const address = await this.consumerService.updateAddress(req.user.userId, parseInt(id), body);
        return { success: true, message: 'Address updated', data: address };
    }

    @Delete('addresses/:id')
    async deleteAddress(@Request() req, @Param('id') id: string) {
        await this.consumerService.deleteAddress(req.user.userId, parseInt(id));
        return { success: true, message: 'Address deleted' };
    }

    // Payment Methods
    @Get('payment-methods')
    async getPaymentMethods(@Request() req) {
        const methods = await this.consumerService.getPaymentMethods(req.user.userId);
        return { success: true, data: methods };
    }

    @Post('payment-methods')
    async addPaymentMethod(@Request() req, @Body() body: any) {
        const method = await this.consumerService.addPaymentMethod(req.user.userId, body);
        return { success: true, message: 'Payment method added', data: method };
    }

    @Put('payment-methods/:id')
    async updatePaymentMethod(@Request() req, @Param('id') id: string, @Body() body: any) {
        const method = await this.consumerService.updatePaymentMethod(req.user.userId, parseInt(id), body);
        return { success: true, message: 'Payment method updated', data: method };
    }

    @Delete('payment-methods/:id')
    async deletePaymentMethod(@Request() req, @Param('id') id: string) {
        await this.consumerService.deletePaymentMethod(req.user.userId, parseInt(id));
        return { success: true, message: 'Payment method deleted' };
    }

    // Cart
    @Get('cart')
    async getCart(@Request() req) {
        const items = await this.consumerService.getCart(req.user.userId);
        const subtotal = items.reduce((sum, item) => sum + item.item_total, 0);
        return {
            success: true,
            data: {
                items: items.map(item => ({
                    ...item,
                    unit_price: item.sack_size_kg 
                        ? parseFloat(item.unit_price)  // sack price from product_sack_sizes
                        : parseFloat(item.price_per_kg) // kg price
                })),
                subtotal,
                item_count: items.length
            }
        };
    }

    @Post('cart')
    async addToCart(@Request() req, @Body() body: any) {
        const item = await this.consumerService.addToCart(req.user.userId, body);
        return { success: true, message: 'Item added to cart', data: item };
    }

    @Put('cart/:id')
    async updateCartItem(@Request() req, @Param('id') id: string, @Body() body: any) {
        const item = await this.consumerService.updateCartItem(req.user.userId, parseInt(id), body.quantity);
        return { success: true, message: 'Cart item updated', data: item };
    }

    @Delete('cart/:id')
    async removeCartItem(@Request() req, @Param('id') id: string) {
        await this.consumerService.removeCartItem(req.user.userId, parseInt(id));
        return { success: true, message: 'Item removed from cart' };
    }

    @Delete('cart')
    async clearCart(@Request() req) {
        await this.consumerService.clearCart(req.user.userId);
        return { success: true, message: 'Cart cleared' };
    }

    // Orders
    @Get('orders')
    async getOrders(@Request() req) {
        const orders = await this.consumerService.getOrders(req.user.userId);
        return { success: true, data: orders };
    }

    @Post('orders')
    async createOrder(@Request() req, @Body() body: any) {
        const order = await this.consumerService.createOrder(req.user.userId, body);
        return { success: true, message: 'Order created', data: order };
    }

    @Get('orders/:id')
    async getOrderDetails(@Request() req, @Param('id') id: string) {
        const order = await this.consumerService.getOrderDetails(req.user.userId, parseInt(id));
        return { success: true, data: order };
    }

    @Post('orders/:id/cancel')
    async cancelOrder(@Request() req, @Param('id') id: string) {
        const order = await this.consumerService.cancelOrder(req.user.userId, parseInt(id));
        return { success: true, message: 'Order cancelled', data: order };
    }

    // Favorites
    @Get('favorites')
    async getFavorites(@Request() req) {
        const favorites = await this.consumerService.getFavorites(req.user.userId);
        return { success: true, data: favorites };
    }

    @Post('favorites/:productId')
    async addFavorite(@Request() req, @Param('productId') productId: string) {
        await this.consumerService.addFavorite(req.user.userId, parseInt(productId));
        return { success: true, message: 'Added to favorites' };
    }

    @Delete('favorites/:productId')
    async removeFavorite(@Request() req, @Param('productId') productId: string) {
        await this.consumerService.removeFavorite(req.user.userId, parseInt(productId));
        return { success: true, message: 'Removed from favorites' };
    }

    @Get('favorites/:productId/check')
    async checkFavorite(@Request() req, @Param('productId') productId: string) {
        const isFavorite = await this.consumerService.checkFavorite(req.user.userId, parseInt(productId));
        return { success: true, data: { isFavorite } };
    }

    @Post('favorites/:productId/toggle')
    async toggleFavorite(@Request() req, @Param('productId') productId: string) {
        const result = await this.consumerService.toggleFavorite(req.user.userId, parseInt(productId));
        return { success: true, data: result };
    }

    // Search & Browsing
    @Get('products/search')
    async searchProducts(@Request() req, @Query() query: any) {
        const results = await this.consumerService.searchProducts(query, req.user.userId);
        return { success: true, data: results };
    }

    @Get('products/:id')
    async getProductDetails(@Request() req, @Param('id') id: string) {
        const product = await this.consumerService.getProductDetails(parseInt(id), req.user.userId);
        return { success: true, data: product };
    }

    @Get('homepage')
    async getHomepage(@Request() req) {
        const data = await this.consumerService.getHomepageData(req.user.userId);
        return { success: true, data };
    }

    // ===================== Farmer Storefront =====================
    @Get('farmers/:farmerId/storefront')
    async getFarmerStorefront(@Request() req, @Param('farmerId') farmerId: string) {
        const data = await this.consumerService.getFarmerStorefront(parseInt(farmerId), req.user.userId);
        return { success: true, data };
    }

    @Get('farmers/:farmerId/reviews')
    async getFarmerReviews(@Request() req, @Param('farmerId') farmerId: string, @Query('limit') limit?: string, @Query('offset') offset?: string) {
        const reviews = await this.consumerService.getFarmerReviews(parseInt(farmerId), parseInt(limit || '20'), parseInt(offset || '0'));
        return { success: true, data: reviews };
    }

    @Get('farmers/:farmerId/rating')
    async getFarmerRating(@Param('farmerId') farmerId: string) {
        const rating = await this.consumerService.getFarmerRating(parseInt(farmerId));
        return { success: true, data: rating };
    }

    // ===================== Reviews =====================
    @Post('orders/:orderId/review')
    async createReview(@Request() req, @Param('orderId') orderId: string, @Body() body: any) {
        const { rating, comment, product_id } = body;
        if (!rating || rating < 1 || rating > 5) {
            throw new BadRequestException('Rating must be between 1 and 5');
        }
        try {
            const review = await this.consumerService.createReview(req.user.userId, parseInt(orderId), rating, comment, product_id);
            return { success: true, message: 'Review submitted', data: review };
        } catch (e) {
            throw new BadRequestException(e.message);
        }
    }

    @Get('orders/:orderId/review')
    async checkOrderReview(@Request() req, @Param('orderId') orderId: string) {
        const review = await this.consumerService.checkOrderReview(req.user.userId, parseInt(orderId));
        return { success: true, data: review };
    }

    @Get('products/:productId/reviews')
    async getProductReviews(@Param('productId') productId: string, @Query('limit') limit?: string, @Query('offset') offset?: string) {
        const reviews = await this.consumerService.getProductReviews(parseInt(productId), parseInt(limit || '20'), parseInt(offset || '0'));
        return { success: true, data: reviews };
    }

    // ===================== Notifications =====================
    @Get('notifications')
    async getNotifications(@Request() req, @Query('limit') limit?: string) {
        const notifications = await this.consumerService.getNotifications(req.user.userId, parseInt(limit || '50'));
        return { success: true, data: notifications };
    }

    @Put('notifications/:notificationId/read')
    async markNotificationAsRead(@Request() req, @Param('notificationId') notificationId: string) {
        const notification = await this.consumerService.markNotificationAsRead(req.user.userId, parseInt(notificationId));
        if (!notification) throw new NotFoundException('Notification not found');
        return { success: true, data: notification };
    }

    @Put('notifications/read-all')
    async markAllNotificationsAsRead(@Request() req) {
        await this.consumerService.markAllNotificationsAsRead(req.user.userId);
        return { success: true, message: 'All notifications marked as read' };
    }

    @Get('notifications/unread-count')
    async getUnreadCount(@Request() req) {
        const count = await this.consumerService.getUnreadCount(req.user.userId);
        return { success: true, data: { unread_count: count } };
    }

    // ===================== Promo Codes =====================
    @Post('promo-codes/validate')
    async validatePromoCode(@Body() body: any) {
        const { code, order_amount } = body;
        if (!code) throw new BadRequestException('Promo code is required');
        if (!order_amount || order_amount <= 0) throw new BadRequestException('Valid order amount is required');
        const result = await this.consumerService.validatePromoCode(code, parseFloat(order_amount));
        return { success: true, data: result };
    }

    // ===================== COD Eligibility =====================
    @Post('payments/cod/check-eligibility')
    async checkCODEligibility(@Request() req, @Body() body: any) {
        const { order_amount, farmer_id } = body;
        if (!order_amount || order_amount <= 0) throw new BadRequestException('Valid order amount is required');
        const result = await this.consumerService.checkCODEligibility(req.user.userId, parseFloat(order_amount), farmer_id ? parseInt(farmer_id) : undefined);
        return { success: true, data: result };
    }
}
