import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { Tag } from './entities/tag.entity';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepo: Repository<Tag>,
  ) {}

  async create(teacherId: string, createTagDto: CreateTagDto) {
    const tag = this.tagRepo.create({
      ...createTagDto,
      teacherId,
    });
    return this.tagRepo.save(tag);
  }

  async findAll(teacherId: string) {
    return this.tagRepo.find({
      where: {
        teacher: {
          id: teacherId,
        },
      },
    });
  }

  async findOne(teacherId: string, id: number) {
    const tag = await this.tagRepo.findOne({
      where: { id, teacher: { id: teacherId } },
    });

    if (!tag) throw new NotFoundException('Tag not found');

    return tag;
  }

  async update(teacherId: string, id: number, updateTagDto: UpdateTagDto) {
    const tag = await this.findOne(teacherId, id);

    Object.assign(tag, updateTagDto);
    return this.tagRepo.save(tag);
  }

  async remove(teacherId: string, id: number) {
    const tag = await this.findOne(teacherId, id);

    await this.tagRepo.remove(tag);

    return { deleted: true };
  }
}
