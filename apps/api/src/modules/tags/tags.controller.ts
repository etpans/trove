import { Request, Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  create(@Body() createTagDto: CreateTagDto) {
    return this.tagsService.create(createTagDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.tagsService.findAll(req.user.teacherId);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.tagsService.findOne(req.user.teacherId, +id);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() updateTagDto: UpdateTagDto) {
    return this.tagsService.update(req.user.teacherId, +id, updateTagDto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.tagsService.remove(req.user.teacherid, +id);
  }
}
