
import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) { }

    async validateUser(email: string, phone: string, pass: string): Promise<any> {
        const user = await this.usersService.findByEmailOrPhone(email, phone);
        if (user && (await this.usersService.verifyPassword(pass, user.password_hash))) {
            const { password_hash, ...result } = user;
            return result;
        }
        return null;
    }

    async login(user: any) {
        const payload = { userId: user.user_id, role: user.role };
        return {
            token: this.jwtService.sign(payload),
            user: {
                user_id: user.user_id,
                email: user.email,
                phone: user.phone,
                role: user.role,
                verification_status: user.verification_status,
            },
            redirectPath: this.getRedirectPath(user.role),
        };
    }

    async signup(signupData: any) {
        try {
            const user = await this.usersService.create(signupData);
            return this.login(user);
        } catch (error) {
            if (error.message === 'Email already exists' || error.message === 'Phone number already exists') {
                throw new ConflictException(error.message);
            }
            throw error;
        }
    }

    getRedirectPath(role: string) {
        const roleMap = {
            'CONSUMER': '/consumer/home',
            'FARMER': '/farmer/home',
            'ADMIN': '/admin/home'
        };
        return roleMap[role] || '/consumer/home';
    }
}
