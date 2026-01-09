
import { Controller, Get, Put, Post, Body, Param, Query, UseGuards, Request, BadRequestException, NotFoundException } from '@nestjs/common';
import { FarmersService } from './farmers.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('api/farmer')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('FARMER')
export class FarmersController {
    constructor(private readonly farmersService: FarmersService) { }

    @Get('profile')
    async getProfile(@Request() req) {
        const profile = await this.farmersService.getProfile(req.user.userId);
        return { success: true, data: profile };
    }

    @Put('profile')
    async updateProfile(@Request() req, @Body() body: any) {
        const profile = await this.farmersService.updateProfile(req.user.userId, body);
        await this.farmersService.setVerificationStatus(req.user.userId, 'PENDING_DOCUMENTS');
        return { success: true, message: 'Profile updated', data: profile };
    }

    @Post('verification/documents')
    async uploadDocuments(@Request() req, @Body() body: any) {
        const { documents } = body;
        if (!Array.isArray(documents) || documents.length === 0) {
            throw new BadRequestException('No documents provided');
        }

        const results: any[] = [];
        for (const doc of documents) {
            if (!doc.doc_type) continue;
            const saved = await this.farmersService.addDocument(req.user.userId, doc.doc_type, doc.file_data);
            results.push(saved);
        }

        await this.farmersService.setVerificationStatus(req.user.userId, 'PENDING_REVIEW');
        return { success: true, message: 'Documents uploaded', data: results };
    }

    @Get('verification/status')
    async getVerificationStatus(@Request() req) {
        const profile = await this.farmersService.getProfile(req.user.userId);
        const docs = await this.farmersService.listDocuments(req.user.userId);
        return {
            success: true,
            data: {
                verification_status: profile?.verification_status,
                documents: docs,
                reason: profile?.verification_reason || null,
            },
        };
    }

    // ===================== Farmer Orders =====================
    @Get('orders')
    async getOrders(@Request() req, @Query('status') status?: string) {
        const orders = await this.farmersService.getOrders(req.user.userId, status);
        return { success: true, data: orders };
    }

    @Get('orders/:orderId')
    async getOrderDetails(@Request() req, @Param('orderId') orderId: string) {
        const order = await this.farmersService.getOrderDetails(req.user.userId, parseInt(orderId));
        if (!order) throw new NotFoundException('Order not found');
        return { success: true, data: order };
    }

    @Post('orders/:orderId/accept')
    async acceptOrder(@Request() req, @Param('orderId') orderId: string) {
        const order = await this.farmersService.acceptOrder(req.user.userId, parseInt(orderId));
        if (!order) throw new NotFoundException('Order not found or already processed');
        return { success: true, message: 'Order accepted', data: order };
    }

    @Post('orders/:orderId/reject')
    async rejectOrder(@Request() req, @Param('orderId') orderId: string, @Body() body: any) {
        const { reason, notes } = body;
        if (!reason) throw new BadRequestException('Rejection reason is required');
        const order = await this.farmersService.rejectOrder(req.user.userId, parseInt(orderId), reason, notes);
        if (!order) throw new NotFoundException('Order not found or already processed');
        return { success: true, message: 'Order rejected', data: order };
    }

    @Put('orders/:orderId/status')
    async updateOrderStatus(@Request() req, @Param('orderId') orderId: string, @Body() body: any) {
        const { status } = body;
        if (!status) throw new BadRequestException('Status is required');
        try {
            const order = await this.farmersService.updateOrderStatus(req.user.userId, parseInt(orderId), status);
            if (!order) throw new NotFoundException('Order not found');
            return { success: true, message: 'Order status updated', data: order };
        } catch (e) {
            throw new BadRequestException(e.message);
        }
    }

    @Post('orders/:orderId/not-completed')
    async markOrderNotCompleted(@Request() req, @Param('orderId') orderId: string, @Body() body: any) {
        const { reason, notes } = body;
        if (!reason) throw new BadRequestException('Explanation is required');
        const order = await this.farmersService.markOrderNotCompleted(req.user.userId, parseInt(orderId), reason, notes);
        if (!order) throw new NotFoundException('Order not found or cannot be marked as not completed');
        return { success: true, message: 'Order marked as not completed', data: order };
    }

    // ===================== Farmer Ledger =====================
    @Get('ledger')
    async getLedger(@Request() req) {
        const ledger = await this.farmersService.getLedger(req.user.userId);
        return { success: true, data: ledger };
    }

    // ===================== Farmer Payouts =====================
    @Get('payouts')
    async getPayouts(@Request() req) {
        const payouts = await this.farmersService.getPayouts(req.user.userId);
        return { success: true, data: payouts };
    }

    @Post('payouts/request')
    async requestPayout(@Request() req, @Body() body: any) {
        const { amount, bankDetails } = body;
        if (!amount || amount <= 0) throw new BadRequestException('Valid amount is required');
        try {
            const payout = await this.farmersService.requestPayout(req.user.userId, parseFloat(amount), bankDetails);
            return { success: true, message: 'Payout requested', data: payout };
        } catch (e) {
            throw new BadRequestException(e.message);
        }
    }

    // ===================== Farmer Reviews =====================
    @Get('reviews')
    async getReviews(@Request() req, @Query('limit') limit?: string, @Query('offset') offset?: string) {
        const reviews = await this.farmersService.getReviews(
            req.user.userId,
            parseInt(limit || '50'),
            parseInt(offset || '0')
        );
        return { success: true, data: reviews };
    }
}
