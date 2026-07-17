import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  create(@Request() req: { user: { userId: string } }, @Body() createStudentDto: CreateStudentDto) {
    return this.studentsService.create(req.user.userId, createStudentDto);
  }

  @Get()
  findAll(@Request() req: { user: { userId: string } }) {
    return this.studentsService.findAll(req.user.userId);
  }

  @Get(':id')
  findOne(@Request() req: { user: { userId: string } }, @Param('id') id: string) {
    return this.studentsService.findOne(req.user.userId, +id);
  }

  @Patch(':id')
  update(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() updateStudentDto: UpdateStudentDto,
  ) {
    return this.studentsService.update(req.user.userId, +id, updateStudentDto);
  }

  @Delete(':id')
  remove(@Request() req: { user: { userId: string } }, @Param('id') id: string) {
    return this.studentsService.remove(req.user.userId, +id);
  }
}
