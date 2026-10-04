/*
# Fix: Grant UPDATE privilege to authenticated on profiles

The authenticated role was missing UPDATE privilege on the profiles table.
This caused "permission denied for table profiles" when admin/direction tried
to update profiles (activate/deactivate, edit, etc.).
*/

GRANT UPDATE ON profiles TO authenticated;
