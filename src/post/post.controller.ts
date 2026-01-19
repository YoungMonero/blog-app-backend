import { Controller, Get, Param, Post } from '@nestjs/common';
import { create } from 'domain';

@Controller('post')
export class PostController {
    @Get(':id')
    findOne(@Param() id){
        return id;
    }
    findAll(){
        return "All post are solid and working";
    }
    
    @Get()
    @Post()
    create(){
      return "this will create a post"
}
}
