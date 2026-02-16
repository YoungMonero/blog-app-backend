import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  constructor(private mailerService: MailerService) {}

  async sendResetCode(email: string, resetCode: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Reset Your Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p style="font-size: 16px; color: #555;">
              You requested to reset your password. Use the code below:
            </p>
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; border-radius: 8px;">
              ${resetCode}
            </div>
            <p style="font-size: 14px; color: #777; margin-top: 20px;">
              This code will expire in 15 minutes.
            </p>
            <p style="font-size: 14px; color: #777;">
              If you didn't request this, please ignore this email.
            </p>
          </div>
        `,
      });
      console.log(`Email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  async sendPasswordChangedConfirmation(email: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Password Changed Successfully',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Updated</h2>
            <p style="font-size: 16px; color: #555;">
              Your password has been successfully changed.
            </p>
            <p style="font-size: 14px; color: #777;">
              If you didn't make this change, please contact support immediately.
            </p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Failed to send confirmation:', error);
    }
  }
}