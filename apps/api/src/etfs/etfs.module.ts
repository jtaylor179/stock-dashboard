import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { EtfsController } from './etfs.controller';
import { EtfsService } from './etfs.service';

@Module({
  imports: [HttpModule],
  controllers: [EtfsController],
  providers: [EtfsService],
})
export class EtfsModule {}
