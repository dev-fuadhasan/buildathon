/**
 * DISMISSED RISKS + AI GENERATED RISKS - SUPABASE DATABASE STORAGE
 * Strong consistency - instant sync across all devices
 */

import { createSupabaseAdminClient } from './supabaseAuth';

export type DismissedRisk = {
  mother_id: string;
  risk_key: string;
  dismissed_at: number;
  created_at?: string;
  updated_at?: string;
};

export type CachedAIRisks = {
  mother_id: string;
  text_hash: string;
  risks: any[];
  created_at: string;
  expires_at: string;
};

/**
 * Get all dismissed risks for a mother
 */
export async function getDismissedRisksDB(motherId: string): Promise<Record<string, number>> {
  try {
    const supabase = createSupabaseAdminClient();
    
    const { data, error } = await supabase
      .from('dismissed_risks')
      .select('risk_key, dismissed_at')
      .eq('mother_id', motherId);
    
    if (error) {
      console.error('[DismissedRisksDB] Load error:', error);
      return {};
    }
    
    // Convert array to object: { riskKey: timestamp }
    const result: Record<string, number> = {};
    (data || []).forEach((row: any) => {
      result[row.risk_key] = row.dismissed_at;
    });
    
    console.log('[DismissedRisksDB] Loaded:', {
      motherId,
      count: Object.keys(result).length,
      keys: Object.keys(result),
    });
    
    return result;
  } catch (err) {
    console.error('[DismissedRisksDB] Unexpected error:', err);
    return {};
  }
}

/**
 * Save dismissed risk (upsert)
 */
export async function saveDismissedRiskDB(motherId: string, riskKey: string, dismissedAt: number): Promise<void> {
  try {
    const supabase = createSupabaseAdminClient();
    
    const { error } = await supabase
      .from('dismissed_risks')
      .upsert(
        {
          mother_id: motherId,
          risk_key: riskKey,
          dismissed_at: dismissedAt,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'mother_id,risk_key',
        }
      );
    
    if (error) {
      console.error('[DismissedRisksDB] Save error:', error);
      throw error;
    }
    
    console.log('[DismissedRisksDB] Saved:', { motherId, riskKey, dismissedAt });
  } catch (err) {
    console.error('[DismissedRisksDB] Save failed:', err);
    throw err;
  }
}

/**
 * Delete dismissed risk (un-dismiss)
 */
export async function deleteDismissedRiskDB(motherId: string, riskKey: string): Promise<void> {
  try {
    const supabase = createSupabaseAdminClient();
    
    const { error } = await supabase
      .from('dismissed_risks')
      .delete()
      .eq('mother_id', motherId)
      .eq('risk_key', riskKey);
    
    if (error) {
      console.error('[DismissedRisksDB] Delete error:', error);
      throw error;
    }
    
    console.log('[DismissedRisksDB] Deleted:', { motherId, riskKey });
  } catch (err) {
    console.error('[DismissedRisksDB] Delete failed:', err);
    throw err;
  }
}

/**
 * Save all dismissed risks at once (batch operation)
 */
export async function saveAllDismissedRisksDB(motherId: string, dismissed: Record<string, number>): Promise<void> {
  try {
    const supabase = createSupabaseAdminClient();
    
    console.log('[DismissedRisksDB] Saving batch:', {
      motherId,
      dismissed: Object.entries(dismissed).map(([k, v]) => ({ key: k, at: new Date(v).toISOString() }))
    });
    
    // First, delete all existing dismissed risks for this mother
    const { error: deleteError } = await supabase
      .from('dismissed_risks')
      .delete()
      .eq('mother_id', motherId);
    
    if (deleteError) {
      console.error('[DismissedRisksDB] Delete error:', deleteError);
    }
    
    // Then insert new ones
    if (Object.keys(dismissed).length > 0) {
      const rows = Object.entries(dismissed).map(([riskKey, dismissedAt]) => ({
        mother_id: motherId,
        risk_key: riskKey,
        dismissed_at: dismissedAt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      
      console.log('[DismissedRisksDB] Inserting rows:', rows);
      
      const { error } = await supabase
        .from('dismissed_risks')
        .insert(rows);
      
      if (error) {
        console.error('[DismissedRisksDB] Batch save error:', error);
        throw error;
      }
    }
    
    console.log('[DismissedRisksDB] ✅ Batch saved successfully:', {
      motherId,
      count: Object.keys(dismissed).length,
    });
  } catch (err) {
    console.error('[DismissedRisksDB] Batch save failed:', err);
    throw err;
  }
}

/**
 * Get cached AI-generated risks for a specific text hash
 * Returns null if not found or expired
 */
export async function getCachedAIRisks(motherId: string, textHash: string): Promise<any[] | null> {
  try {
    const supabase = createSupabaseAdminClient();
    
    const { data, error } = await supabase
      .from('cached_ai_risks')
      .select('risks, expires_at')
      .eq('mother_id', motherId)
      .eq('text_hash', textHash)
      .single();
    
    if (error || !data) {
      console.log('[CachedAIRisks] Not found:', { motherId, textHash });
      return null;
    }
    
    // Check if expired
    const expiresAt = new Date(data.expires_at).getTime();
    if (Date.now() > expiresAt) {
      console.log('[CachedAIRisks] Expired:', { motherId, textHash });
      return null;
    }
    
    console.log('[CachedAIRisks] Found:', {
      motherId,
      textHash,
      count: data.risks?.length || 0,
    });
    
    return data.risks || [];
  } catch (err) {
    console.error('[CachedAIRisks] Get error:', err);
    return null;
  }
}

/**
 * Save AI-generated risks to cloud cache
 */
export async function saveCachedAIRisks(motherId: string, textHash: string, risks: any[]): Promise<void> {
  try {
    const supabase = createSupabaseAdminClient();
    
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    const { error } = await supabase
      .from('cached_ai_risks')
      .upsert(
        {
          mother_id: motherId,
          text_hash: textHash,
          risks,
          created_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        },
        {
          onConflict: 'mother_id,text_hash',
        }
      );
    
    if (error) {
      console.error('[CachedAIRisks] Save error:', error);
      throw error;
    }
    
    console.log('[CachedAIRisks] ✅ Saved:', {
      motherId,
      textHash,
      count: risks.length,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error('[CachedAIRisks] Save failed:', err);
    throw err;
  }
}
