import { Body, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { BaseService } from './base.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
export abstract class BaseController<T extends { id: number }> {
  constructor(protected readonly service: BaseService<T>) {}

  @Post()
  create(@Body() body: Partial<T>) {
    return this.service.create(body as any);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(Number(id));
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<T>) {
    return this.service.update(Number(id), body as any);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }
}
