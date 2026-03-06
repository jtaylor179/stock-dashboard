import { Injectable, OnModuleInit } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

type SupabaseClientType = ReturnType<typeof createClient>;

@Injectable()
export class SupabaseService implements OnModuleInit {
  private client: SupabaseClientType;

  onModuleInit() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env');
    }
    this.client = createClient(url, key, {
      db: { schema: 'portfolio_manager' },
    } as any);
  }

  getClient(): SupabaseClientType {
    return this.client;
  }
}
