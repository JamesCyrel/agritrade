
import { Controller, Get, Put, Post, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
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
}
