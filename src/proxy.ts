import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { authRoutes, excludePaths } from "./lib/utils/path-utils";
import { getCachedUserPermissions, hasPermissionInCache } from "./lib/cache/permissions";
import { ROUTE_PERMISSION_MAP } from "./lib/constants/permissions";

// Add /verify to excluded paths at runtime (in case it's not inside path-utils)
const UPDATED_EXCLUDE_PATHS = [...excludePaths, "/verify"];

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const currentPath = url.pathname;

  // Initialize Supabase client for session management
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Get user to refresh session - this must happen before any logic
  // to ensure session tokens are properly refreshed
  const {
    data: { user: supabaseUser },
    error: authError,
  } = await supabase.auth.getUser();

  // Handle auth errors gracefully - "session missing" is expected for unauthenticated users
  if (authError && 
      !authError.message?.includes('refresh') && 
      !authError.message?.includes('session')) {
    console.error('Auth error in proxy:', authError.message);
  }

  // Redirect authenticated users away from landing page
  if (currentPath === "/" && supabaseUser) {
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  // Allow landing page (root) for unauthenticated users
  if (currentPath === "/") {
    return response;
  }

  // Check if current path starts with any auth route
  const isAuthRoute = authRoutes.some((route) =>
    currentPath.startsWith(route)
  );

  // Updated exclusion check (includes /verify)
  const isExcludedPath = UPDATED_EXCLUDE_PATHS.some(
    (path) => currentPath === path || currentPath.startsWith(`${path}/`)
  );

  // Handle auth routes redirections
  if (!supabaseUser && !isAuthRoute && !isExcludedPath) {
    
    url.pathname = "/login";
    return NextResponse.redirect(url);
  } else if (supabaseUser && isAuthRoute) {
    // Allow access to device approval page for authenticated users
    if (currentPath === '/auth/device-approval') {
      return response;
    }
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  // Allow excluded paths (like /verify) to pass through
  if (isExcludedPath) {
    return response;
  }

  // At this point, user must exist (checked above)
  if (!supabaseUser) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Check for superadmin routes
  const isSuperadminRoute = currentPath.startsWith("/sa");

  if (isSuperadminRoute) {
    // Check if user is a superadmin
    const { data: superadminData, error: superadminError } = await supabase
      .rpc('is_superadmin', { check_user_id: supabaseUser.id });

    if (superadminError || !superadminData) {
      url.pathname = "/unauthorized";
      return NextResponse.redirect(url);
    }

    return response;
  }

  // Fetch employee data and cached permissions
  const [employeeResult, cachedPermissions] = await Promise.all([
    supabase
      .from("employees")
      .select("has_approval, rejection_reason, company_id")
      .eq("id", supabaseUser.id)
      .single(),
    getCachedUserPermissions(supabaseUser.id, supabase)
  ]);

  const { data: employee, error } = employeeResult;
  const { data: userPermissions, error: permError } = cachedPermissions;
  const isOnboardingRoute = currentPath === "/onboarding";

  // If no employee record found, redirect to onboarding
  if (!employee || error) {
    if (!isOnboardingRoute) {
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
    return response;
  }

  const { has_approval, rejection_reason } = employee;

  // Handle pending approval state
  if (has_approval === "PENDING") {
    if (url.searchParams.get("status") !== "pending") {
      url.pathname = "/onboarding";
      url.searchParams.set("status", "pending");
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Handle rejected approval state
  if (has_approval === "REJECTED") {
    const currentStatus = url.searchParams.get("status");
    if (currentStatus !== "rejected") {
      url.pathname = "/onboarding";
      url.searchParams.set("status", "rejected");
      if (rejection_reason) {
        url.searchParams.set("reason", rejection_reason);
      }
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Redirect away from onboarding if already approved
  if (isOnboardingRoute) {
    url.pathname = "/hris";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Permission-based access control using cached permissions
  // Handle permission errors gracefully
  if (permError) {
    if (permError.code === "42883") {
      return response;
    }
  }

  // Require at least one permission to access the app
  if (!userPermissions || userPermissions.length === 0) {
    url.pathname = "/unauthorized";
    return NextResponse.redirect(url);
  }

  // Check specific route permissions using cached data
  const matchedRoute = Object.keys(ROUTE_PERMISSION_MAP).find(
    (route) => currentPath === route || currentPath.startsWith(`${route}/`)
  );

  if (matchedRoute) {
    const requiredPermission = ROUTE_PERMISSION_MAP[matchedRoute];
    
    // Use cached permissions instead of additional RPC call
    const hasAccess = hasPermissionInCache(
      userPermissions,
      requiredPermission.module,
      requiredPermission.action
    );

    if (!hasAccess) {
      url.pathname = "/unauthorized";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|workbox-.*|swe-worker.*|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
