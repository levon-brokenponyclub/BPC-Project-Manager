-- Create a function to get workspace users with their emails and avatars
-- This function joins workspace_users with auth.users to get email addresses and avatar URLs

CREATE OR REPLACE FUNCTION get_workspace_users_with_emails(workspace_id_param UUID)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  avatar_url TEXT,
  first_name TEXT,
  surname TEXT,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wu.user_id,
    u.email::TEXT,
    (u.raw_user_meta_data->>'avatar_url')::TEXT,
    (u.raw_user_meta_data->>'first_name')::TEXT,
    (u.raw_user_meta_data->>'surname')::TEXT,
    wu.role::TEXT
  FROM workspace_users wu
  INNER JOIN auth.users u ON u.id = wu.user_id
  WHERE wu.workspace_id = workspace_id_param
  ORDER BY u.email;
END;
$$;
