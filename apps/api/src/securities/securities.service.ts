import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class SecuritiesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getSecurity(securityId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: security, error: secError } = await supabase
      .from('security')
      .select('*')
      .eq('security_id', securityId)
      .single();

    if (secError) throw new Error(secError.message);

    const { data: watchlistItem } = await supabase
      .from('watchlist')
      .select('*')
      .eq('security_id', securityId)
      .maybeSingle();

    return { security, watchlistItem };
  }

  async getAnalyses(securityId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('security_analyses')
      .select('*')
      .eq('security_id', securityId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }
}
