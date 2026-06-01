import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { AcademicsService } from './academics.service';

@Controller('academics')
export class AcademicsController {
  constructor(private readonly service: AcademicsService) {}

  // Classes
  @Post('classes')
  createClass(@Body() body: any) {
    return this.service.createClass(body);
  }

  @Get('classes')
  findClasses() {
    return this.service.findClasses();
  }

  @Get('classes/:id')
  findClass(@Param('id') id: string) {
    return this.service.findClass(Number(id));
  }

  @Put('classes/:id')
  updateClass(@Param('id') id: string, @Body() body: any) {
    return this.service.updateClass(Number(id), body);
  }

  @Delete('classes/:id')
  removeClass(@Param('id') id: string) {
    return this.service.removeClass(Number(id));
  }

  // Subjects
  @Post('subjects')
  createSubject(@Body() body: any) {
    return this.service.createSubject(body);
  }

  @Get('subjects')
  findSubjects() {
    return this.service.findSubjects();
  }

  @Get('subjects/:id')
  findSubject(@Param('id') id: string) {
    return this.service.findSubject(Number(id));
  }

  @Put('subjects/:id')
  updateSubject(@Param('id') id: string, @Body() body: any) {
    return this.service.updateSubject(Number(id), body);
  }

  @Delete('subjects/:id')
  removeSubject(@Param('id') id: string) {
    return this.service.removeSubject(Number(id));
  }
}
