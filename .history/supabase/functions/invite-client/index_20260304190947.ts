// Supabase Edge Function: invite-client
// @deno-types="npm:@supabase/supabase-js@2"
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const APP_BASE_URL = Deno.env.get('APP_BASE_URL')
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: 'Supabase env missing' }, 500)
    }

    const { workspaceId, email, role } = await req.json()
    if (!workspaceId || !email || role !== 'client') {
      return jsonResponse({ error: 'Invalid input' }, 400)
    }

    // Auth: require authenticated caller
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Missing auth' }, 401)
    }

    // Service role client to bypass RLS
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Get caller user from auth header
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      return jsonResponse({ error: 'Invalid auth token' }, 401)
    }

    // Authorize caller is admin in workspace
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('workspace_users')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership || membership.role !== 'admin') {
      return jsonResponse({ error: 'Not authorized' }, 403)
    }

    // Invite user
    const redirectTo = APP_BASE_URL ? `${APP_BASE_URL}/auth/invite` : `${new URL(req.url).origin}/auth/invite`
    const { data: invite, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo })
    
    if (inviteError) {
      return jsonResponse({ error: inviteError.message }, 500)
    }

    // Upsert membership
    const invitedUserId = invite.user?.id
    if (invitedUserId) {
      await supabaseAdmin.from('workspace_users').upsert({ 
        workspace_id: workspaceId, 
        user_id: invitedUserId, 
        role: 'client' 
      })
    }

    return jsonResponse({ ok: true }, 200)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return jsonResponse({ error: message }, 500)
  }
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
