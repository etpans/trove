import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
// import { AppController } from './app.controller';
// import { AppService } from './app.service';

@Module({
  imports: [
    // load .env files
    ConfigModule.forRoot({ isGlobal: true }),

    // connect to postgresql
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: true, // turn off in production
      }),
    }),
  ],
  // controllers: [AppController],
  // providers: [AppService],
})
export class AppModule {}
