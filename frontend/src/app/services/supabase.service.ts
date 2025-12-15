import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  readonly client: SupabaseClient;

  constructor() {
    this.client = new SupabaseClient(
      environment.supabaseUrl,
      environment.supabaseKey,
    );
  }
}
