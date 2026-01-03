import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if user is already authenticated
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  // Silently handle auth session missing errors - expected for login/signup pages
  if (error) {
    // Only log non-session errors in development
    if (process.env.NODE_ENV === 'development' && 
        !error.message?.includes('session') && 
        !error.message?.includes('refresh')) {
      console.log('Auth layout info:', error.message);
    }
    // No user session, show auth pages
    return <>{children}</>;
  }
  
  if (user) {
    // Check if user has completed onboarding
    const { data: employee } = await supabase
      .from('employees')
      .select('has_approval')
      .eq('id', user.id)
      .single();
    
    if (employee?.has_approval === 'ACCEPTED') {
      // User is approved, redirect to home
      redirect('/home');
    } else {
      // User needs to complete onboarding
      redirect('/onboarding');
    }
  }
  
  // Not authenticated - show auth pages (login, signup, etc.)
  return <>{children}</>;
}
