import {
  Request,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  create(@Request() req: { user: { userId: string } }, @Body() createTagDto: CreateTagDto) {
    return this.tagsService.create(req.user.userId, createTagDto);
  }

  @Get()
  findAll(@Request() req: { user: { userId: string } }) {
    return this.tagsService.findAll(req.user.userId);
  }

  @Get(':id')
  findOne(@Request() req: { user: { userId: string } }, @Param('id') id: string) {
    return this.tagsService.findOne(req.user.userId, +id);
  }

  @Patch(':id')
  update(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() updateTagDto: UpdateTagDto,
  ) {
    return this.tagsService.update(req.user.userId, +id, updateTagDto);
  }

  @Delete(':id')
  remove(@Request() req: { user: { userId: string } }, @Param('id') id: string) {
    return this.tagsService.remove(req.user.userId, +id);
  }
}
