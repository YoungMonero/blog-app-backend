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
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';
import { ParseObjectIdPipe } from './common/pipes/parse-object-id.pipe';

interface JwtPayload {
  userId: string;
  email: string;
  tenantId: string;
  sub: string;
}

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  async create(
    @Body() createPostDto: CreatePostDto,
    @Req() req: Request & { user: JwtPayload },
  ) {
    const userId = req.user.userId || req.user.sub;
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('No tenant associated with user');
    }

    return this.postService.create(createPostDto, userId, tenantId);
  }

  @Get()
  async findAll(@Req() req: Request & { user: JwtPayload }) {
    return this.postService.findAllByTenant(req.user.tenantId);
  }

  @Get('drafts')
  async findDrafts(@Req() req: Request & { user: JwtPayload }) {
    return this.postService.findByStatus(req.user.tenantId, 'draft');
  }

  @Get('published')
  async findPublished(@Req() req: Request & { user: JwtPayload }) {
    return this.postService.findByStatus(req.user.tenantId, 'published');
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseObjectIdPipe()) id: string,
    @Req() req: Request & { user: JwtPayload },
  ) {
    const post = await this.postService.findOne(id);
    const userId = req.user.userId || req.user.sub;

    if (post.authorId.toString() !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return post;
  }

  @Put(':id')
  async update(
    @Param('id', new ParseObjectIdPipe()) id: string,
    @Body() updatePostDto: UpdatePostDto,
    @Req() req: Request & { user: JwtPayload },
  ) {
    const userId = req.user.userId || req.user.sub;
    return this.postService.update(id, updatePostDto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', new ParseObjectIdPipe()) id: string,
    @Req() req: Request & { user: JwtPayload },
  ) {
    const userId = req.user.userId || req.user.sub;
    return this.postService.remove(id, userId);
  }
}
