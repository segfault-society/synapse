import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRole, getCurrentUserId, hasPermission } from "@/lib/rbac/server";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Double-check authorization on the server side
  // This is in addition to middleware protection for defense in depth
  const role = await getCurrentUserRole();
  
  if (!role || role !== 'admin') {
    redirect("/?error=unauthorized");
  }
  
  // Additional permission check
  const canAccess = await hasPermission('admin.access');
  if (!canAccess) {
    redirect("/?error=unauthorized");
  }

  // Get current user ID from validated JWT claims
  const currentUserId = await getCurrentUserId();

  // Fetch users data server-side using the admin function
  // This is safe because the function checks admin permission internally
  const supabase = await createClient();
  
  // Get all users from the admin function (replaces the old view)
  const { data: users, error } = await supabase
    .rpc('get_admin_users')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch users:', error);
  }

  return (
    <AdminDashboard 
      users={users || []} 
      currentUserId={currentUserId || ''} 
    />
  );
}
