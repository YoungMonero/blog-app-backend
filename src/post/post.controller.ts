import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  BadRequestException
} from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

interface JwtPayload {
  userId: string;
  sub: string;
  tenantId?: string;
  email?: string;
}

interface AuthRequest extends Request {
  user: JwtPayload;
}

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostController {
  constructor(private readonly postService: PostService) {}

  // This method now GUARANTEES a string return
  private getUserId(req: AuthRequest): string {
    const userId = req.user?.userId || req.user?.sub;
    
    if (!userId) {
      console.error('No userId in JWT payload:', req.user);
      throw new UnauthorizedException('Authentication failed: No user ID in token');
    }
    
    return userId; // TypeScript knows this is string, not undefined
  }

  @Post()
  async create(@Body() createPostDto: CreatePostDto, @Req() req: AuthRequest) {
    const userId = this.getUserId(req);
    return this.postService.create(createPostDto, userId);
  }

  @Get()
  async findAll(@Req() req: AuthRequest) {
    const userId = this.getUserId(req);
    return this.postService.findAllByUser(userId);
  }

  @Get('published')
  async findPublished(@Req() req: AuthRequest) {
    const userId = this.getUserId(req);
    return this.postService.findPublishedByUser(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.postService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
    @Req() req: AuthRequest,
  ) {
    const userId = this.getUserId(req);
    return this.postService.update(id, updatePostDto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Req() req: AuthRequest) {
    const userId = this.getUserId(req);
    return this.postService.remove(id, userId);
  }
}