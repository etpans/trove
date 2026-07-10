import { Request, Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Post()
  create(@Body() dto: CreateSubjectDto) {
    return this.subjectsService.create(dto);
  }

  @Get()
  findAll(@Request() req) {
    return this.subjectsService.findAll(req.user.teacherId);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.subjectsService.findOne(req.user.teacherId, +id);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateSubjectDto) {
    return this.subjectsService.update(req.user.teacherId, +id, dto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.subjectsService.remove(req.user.teacherId, +id);
  }
}
