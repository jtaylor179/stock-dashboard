import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WatchlistController } from './watchlist.controller';
import { WatchlistService } from './watchlist.service';
import { SupabaseService } from '../supabase/supabase.service';

@Module({
  imports: [HttpModule],
  controllers: [WatchlistController],
  providers: [WatchlistService, SupabaseService],
})
export class WatchlistModule {}
