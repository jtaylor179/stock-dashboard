import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class CoveredCallsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getAll() {
    const supabase = this.supabaseService.getClient() as any;
    const { data, error } = await supabase
      .from('covered_calls')
      .select(`*, security:security_id ( symbol, security_name )`)
      .order('open_date', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }
}
