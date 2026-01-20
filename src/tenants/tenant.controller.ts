import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';

import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './tenant.dto';

@Controller('tenants')
@UseGuards(JwtAuthGuard)
export class TenantController {
  constructor(private tenantService: TenantService) {}

  @Post()
  create(
    @Body() dto: CreateTenantDto,
    @Request() req,
  ) {
    return this.tenantService.createTenant(dto.name, dto.slug, req.user.userId);
  }

  @Get('me')
  getMyTenant(@Request() req) {
    return this.tenantService.findByOwner(req.user.userId);
  }
}
