import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SecuritiesController } from './securities.controller';
import { SecuritiesService } from './securities.service';
import { LiveMetricsService } from './live-metrics.service';
import { SupabaseService } from '../supabase/supabase.service';

@Module({
  imports: [HttpModule],
  controllers: [SecuritiesController],
  providers: [SecuritiesService, LiveMetricsService, SupabaseService],
})
export class SecuritiesModule {}
