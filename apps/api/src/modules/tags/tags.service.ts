import { Injectable } from '@nestjs/common';
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

    return tag;
  }

  async update(teacherId: string, id: number, updateTagDto: UpdateTagDto) {
    const result = await this.tagRepo.update(id, updateTagDto);

    if (!result.affected) return null;

    return this.findOne(teacherId, id);
  }

  async remove(teacherId: string, id: number) {
    const tag = await this.findOne(teacherId, id);

    if (!tag) return null;

    await this.tagRepo.remove(tag);

    return { deleted: true };
  }
}
