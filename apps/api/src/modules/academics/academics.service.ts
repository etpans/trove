import { Injectable } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { SubjectsService } from './subjects.service';
import { ClassEntity } from './class.entity';
import { Subject } from './subject.entity';

@Injectable()
export class AcademicsService {
  constructor(
    private readonly classesService: ClassesService,
    private readonly subjectsService: SubjectsService,
  ) {}

  // Classes
  createClass(data: Partial<ClassEntity>) {
    return this.classesService.create(data);
  }

  findClasses() {
    return this.classesService.findAll();
  }

  findClass(id: number) {
    return this.classesService.findOne(id);
  }

  updateClass(id: number, data: Partial<ClassEntity>) {
    return this.classesService.update(id, data);
  }

  removeClass(id: number) {
    return this.classesService.remove(id);
  }

  // Subjects
  createSubject(data: Partial<Subject>) {
    return this.subjectsService.create(data);
  }

  findSubjects() {
    return this.subjectsService.findAll();
  }

  findSubject(id: number) {
    return this.subjectsService.findOne(id);
  }

  updateSubject(id: number, data: Partial<Subject>) {
    return this.subjectsService.update(id, data);
  }

  removeSubject(id: number) {
    return this.subjectsService.remove(id);
  }
}
