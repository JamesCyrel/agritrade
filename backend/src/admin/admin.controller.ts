
import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
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

    @Get('verifications/pending')
    async listPendingFarmers() {
        const farmers = await this.adminService.listPendingFarmers();
        return { success: true, data: farmers };
    }
}
