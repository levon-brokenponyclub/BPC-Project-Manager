// Supabase Edge Function: invite-client
import { serve } from 'https://deno.land/x/sift@0.6.0/mod.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const APP_BASE_URL = Deno.env.get('APP_BASE_URL')

serve({
  async fetch(request) {
    try {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return new Response(JSON.stringify({ error: 'Supabase env missing' }), { status: 500 })
      }
      const { workspaceId, email, role } = await request.json()
      if (!workspaceId || !email || role !== 'client') {
        return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400 })
      }
      // Auth: require authenticated caller
      const authHeader = request.headers.get('Authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Missing auth' }), { status: 401 })
      }
      const callerUserId = request.headers.get('x-supabase-user-id')
      if (!callerUserId) {
        return new Response(JSON.stringify({ error: 'Missing caller user id' }), { status: 401 })
      }
      // Service role client
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      // Authorize caller is admin in workspace
      const { data: membership, error: membershipError } = await supabase
        .from('workspace_users')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', callerUserId)
        .single()
      if (membershipError || !membership || membership.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Not authorized' }), { status: 403 })
      }
      // Invite user
      const redirectTo = APP_BASE_URL ? `${APP_BASE_URL}/auth/invite` : `${new URL(request.url).origin}/auth/invite`
      const { data: invite, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, { redirectTo })
      if (inviteError) {
        return new Response(JSON.stringify({ error: inviteError.message }), { status: 500 })
      }
      // Upsert membership
      const invitedUserId = invite.user?.id
      if (invitedUserId) {
        await supabase.from('workspace_users').upsert({ workspace_id: workspaceId, user_id: invitedUserId, role: 'client' })
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 })
    }
  },
})

function createClient(url, key) {
  // Minimal Supabase client for Deno
  return new (await import('https://esm.sh/@supabase/supabase-js@2.39.7')).createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}
