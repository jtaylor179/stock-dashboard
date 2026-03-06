import { Module } from '@nestjs/common';
import { SecuritiesController } from './securities.controller';
import { SecuritiesService } from './securities.service';
import { SupabaseService } from '../supabase/supabase.service';

@Module({
  controllers: [SecuritiesController],
  providers: [SecuritiesService, SupabaseService],
})
export class SecuritiesModule {}
