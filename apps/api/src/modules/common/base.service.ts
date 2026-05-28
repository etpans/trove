import { Repository, DeepPartial } from 'typeorm';

export abstract class BaseService<T extends { id: number }> {
  constructor(
    protected readonly repo: Repository<T>,
  ) {}

  create(data: DeepPartial<T>) {
    return this.repo.save(this.repo.create(data));
  }

  findAll() {
    return this.repo.find();
  }

  findOne(id: number) {
    return this.repo.findOneBy({ id } as any);
  }

  async update(id: number, data: DeepPartial<T>) {
    await this.repo.update(id, data as any);
    return this.findOne(id);
  }

  remove(id: number) {
    return this.repo.delete(id);
  }
}
