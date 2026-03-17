import { Module } from '@nestjs/common';
import { CoveredCallsController } from './covered-calls.controller';
import { CoveredCallsService } from './covered-calls.service';
import { SupabaseService } from '../supabase/supabase.service';

@Module({
  controllers: [CoveredCallsController],
  providers: [CoveredCallsService, SupabaseService],
})
export class CoveredCallsModule {}
