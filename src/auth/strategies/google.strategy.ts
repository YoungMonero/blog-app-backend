import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  
  constructor(private readonly authService: AuthService) {
    super({
      clientID: process.env.AUTH_GOOGLE_ID || '',
      clientSecret: process.env.AUTH_GOOGLE_SECRET || '',
      callbackURL: 'https://postory-blog-app.vercel.app/auth/google/callback',
      scope: ['email', 'profile'],
    } as any); 
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
  ) {
    try {
      const { name, emails, photos, _json } = profile;


      if (!_json?.email_verified) {
        throw new UnauthorizedException('Google email is not verified');
      }

      if (!emails || emails.length === 0) {
        throw new UnauthorizedException('No email found from Google');
      }

      const user = await this.authService.validateGoogleUser({
        email: emails[0].value,
        firstName: name.givenName,
        lastName: name.familyName,
        picture: photos?.[0]?.value || null,
      });

      return user;
      
    } catch (error) {
      throw error;
    }
  }
}