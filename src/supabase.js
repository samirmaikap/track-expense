import { createClient } from '@supabase/supabase-js'

const cfg = window.APP_CONFIG || {}
const url = cfg.supabaseUrl || ''
const key = cfg.supabaseKey || ''

export const isConfigured = Boolean(url && key && !url.includes('YOUR_'))
export const supabase = isConfigured ? createClient(url, key) : null

export async function dbLoadData(userId) {
  const { data, error } = await supabase
    .from('user_data')
    .select('data')
    .eq('user_id', userId)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return { categories: [] }
    throw error
  }
  return data.data || { categories: [] }
}

export async function dbSaveData(userId, appData) {
  const { error } = await supabase
    .from('user_data')
    .upsert(
      { user_id: userId, data: appData, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
  if (error) throw error
}
