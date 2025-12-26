
import { Controller, Request, Post, UseGuards, Get, Body, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
    async login(@Body() body: any) {
        const { email, phone, password } = body;
        if ((!email && !phone) || !password) {
            throw new BadRequestException('Email/Phone and Password are required');
        }
        const user = await this.authService.validateUser(email, phone, password);
        if (!user) {
            throw new UnauthorizedException('Invalid email/phone or password');
        }
        const result = await this.authService.login(user);
        return {
            success: true,
            message: 'Login successful',
            data: result
        };
    }

    @Post('signup')
    async signup(@Body() body: any) {
        // Minimal validation handled in service/dto but explicit check here to match legacy
        const { email, phone, password, role } = body;
        if ((!email && !phone) || !password || !role) {
            throw new BadRequestException('Missing required fields');
        }
        const result = await this.authService.signup(body);
        return {
            success: true,
            message: 'User registered successfully',
            data: result
        };
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('verify')
    async verify(@Request() req) {
        return {
            success: true,
            data: req.user
        };
    }
}
