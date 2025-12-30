
import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request, NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('api/admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get('users')
    async listUsers(@Query('role') role: string, @Query('status') status: string) {
        const users = await this.adminService.listUsers(role, status);
        return { success: true, data: users };
    }

    @Get('users/:userId')
    async getUserProfile(@Param('userId') userId: string) {
        const user = await this.adminService.getUserProfile(parseInt(userId));
        if (!user) throw new NotFoundException('User not found');
        return { success: true, data: user };
    }

    @Post('users/:userId/suspend')
    async suspendUser(@Param('userId') userId: string, @Body() body: any) {
        const { reason } = body;
        if (!reason) throw new BadRequestException('Reason is required');
        const result = await this.adminService.suspendUser(parseInt(userId), reason);
        if (!result) throw new NotFoundException('User not found');
        return { success: true, message: 'User suspended', data: result };
    }

    @Post('users/:userId/activate')
    async activateUser(@Param('userId') userId: string) {
        const result = await this.adminService.activateUser(parseInt(userId));
        if (!result) throw new NotFoundException('User not found');
        return { success: true, message: 'User activated', data: result };
    }

    // ===================== Verifications =====================
    @Get('verifications/pending')
    async listPendingFarmers() {
        const farmers = await this.adminService.listPendingFarmers();
        return { success: true, data: farmers };
    }

    @Get('verifications/:userId')
    async getVerificationApplication(@Param('userId') userId: string) {
        const application = await this.adminService.getVerificationApplication(parseInt(userId));
        if (!application) throw new NotFoundException('Application not found');
        return { success: true, data: application };
    }

    @Post('verifications/:userId/approve')
    async approveVerification(@Param('userId') userId: string) {
        const result = await this.adminService.approveVerification(parseInt(userId));
        if (!result) throw new NotFoundException('User not found');
        return { success: true, message: 'Farmer approved', data: result };
    }

    @Post('verifications/:userId/reject')
    async rejectVerification(@Param('userId') userId: string, @Body() body: any) {
        const { reason } = body;
        if (!reason) throw new BadRequestException('Rejection reason is required');
        const result = await this.adminService.rejectVerification(parseInt(userId), reason);
        if (!result) throw new NotFoundException('User not found');
        return { success: true, message: 'Farmer rejected', data: result };
    }

    // ===================== Order Monitoring =====================
    @Get('orders')
    async getAllOrders(@Query() query: any) {
        const orders = await this.adminService.getAllOrders(query);
        return { success: true, data: orders };
    }

    @Get('orders/:orderId')
    async getOrderDetails(@Param('orderId') orderId: string) {
        const order = await this.adminService.getOrderDetails(parseInt(orderId));
        if (!order) throw new NotFoundException('Order not found');
        return { success: true, data: order };
    }

    // ===================== Payout Management =====================
    @Get('payouts')
    async getAllPayouts(@Query() query: any) {
        const payouts = await this.adminService.getAllPayouts(query);
        return { success: true, data: payouts };
    }

    @Get('payouts/:payoutId')
    async getPayoutDetails(@Param('payoutId') payoutId: string) {
        const payout = await this.adminService.getPayoutDetails(parseInt(payoutId));
        if (!payout) throw new NotFoundException('Payout not found');
        return { success: true, data: payout };
    }

    @Post('payouts/:payoutId/approve')
    async approvePayout(@Param('payoutId') payoutId: string, @Body() body: any) {
        const { transactionReference, payoutDate } = body;
        const result = await this.adminService.approvePayout(parseInt(payoutId), transactionReference, payoutDate);
        if (!result) throw new NotFoundException('Payout not found or already processed');
        return { success: true, message: 'Payout approved', data: result };
    }

    @Post('payouts/:payoutId/complete')
    async completePayout(@Param('payoutId') payoutId: string, @Body() body: any) {
        const { transactionReference, payoutDate } = body;
        const result = await this.adminService.completePayout(parseInt(payoutId), transactionReference, payoutDate);
        if (!result) throw new NotFoundException('Payout not found or already completed');
        return { success: true, message: 'Payout completed', data: result };
    }

    @Post('payouts/:payoutId/reject')
    async rejectPayout(@Param('payoutId') payoutId: string, @Body() body: any) {
        const { reason } = body;
        const result = await this.adminService.rejectPayout(parseInt(payoutId), reason);
        if (!result) throw new NotFoundException('Payout not found or already processed');
        return { success: true, message: 'Payout rejected', data: result };
    }

    // ===================== Analytics =====================
    @Get('analytics')
    async getAnalytics(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
        const analytics = await this.adminService.getAnalytics(startDate, endDate);
        return { success: true, data: analytics };
    }

    // ===================== Commission Settings =====================
    @Get('commission-settings')
    async getCommissionSettings() {
        const settings = await this.adminService.getCommissionSettings();
        return { success: true, data: settings };
    }

    @Put('commission-settings')
    async updateCommissionSettings(@Request() req, @Body() body: any) {
        const { rate, minCommission } = body;
        if (rate === undefined) throw new BadRequestException('Rate is required');
        const settings = await this.adminService.updateCommissionSettings(
            parseFloat(rate),
            parseFloat(minCommission || 0),
            req.user.userId
        );
        return { success: true, message: 'Commission settings updated', data: settings };
    }
}
