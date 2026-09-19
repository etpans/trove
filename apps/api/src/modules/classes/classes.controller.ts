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
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ImportClassesCsvDto } from './dto/import-classes-csv.dto';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  create(@Request() req, @Body() createClassDto: CreateClassDto) {
    return this.classesService.create(req.user.userId, createClassDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.classesService.findAll(req.user.userId);
  }

  @Post('import-csv')
  importCsv(@Request() req, @Body() dto: ImportClassesCsvDto) {
    return this.classesService.importCsv(req.user.userId, dto);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.classesService.findOne(req.user.userId, +id);
  }

  @Patch(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateClassDto: UpdateClassDto,
  ) {
    return this.classesService.update(req.user.userId, +id, updateClassDto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.classesService.remove(req.user.userId, +id);
  }
}
