import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PortfoliosController } from './portfolios.controller';
import { PortfoliosService } from './portfolios.service';
import { SupabaseService } from '../supabase/supabase.service';

@Module({
  imports: [HttpModule],
  controllers: [PortfoliosController],
  providers: [PortfoliosService, SupabaseService],
})
export class PortfoliosModule {}
