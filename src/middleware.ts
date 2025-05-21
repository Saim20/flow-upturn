import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getUserFromServer } from "./lib/auth/getUser";
import { createClient } from "./lib/supabase/server";
import { authRoutes, excludePaths, employeeRoutes, managerRoutes, adminRoutes } from "./lib/utils/path-utils";

type Role = "Employee" | "Manager" | "Admin";



export async function middleware(request: NextRequest) {
  // Initialize Supabase client for session management
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // Get user info from Supabase
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const currentPath = url.pathname;

  // Check if current path starts with any auth route
  const isAuthRoute = authRoutes.some((route) =>
    currentPath.startsWith(route)
  );

  // Check if path is excluded from auth checks
  const isExcludedPath = excludePaths.some(path =>
    currentPath === path || currentPath.startsWith(`${path}/`)
  );

  // Handle auth routes redirections
  if (!supabaseUser && !isAuthRoute && !isExcludedPath) {
    // No user, redirect to login page
    url.pathname = "/login";
    return NextResponse.redirect(url);
  } else if (supabaseUser && isAuthRoute) {
    // User is logged in but trying to access auth pages, redirect to profile
    url.pathname = "/profile";
    return NextResponse.redirect(url);
  }

  // If path is excluded or auth route, return early
  if (isExcludedPath) {
    return response;
  }

  // Standard middleware checks from here
  // Get user data from context
  const { user } = await getUserFromServer();
  if (!user) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect "/" to "/home"
  if (currentPath === "/") {
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  // Check employee status from database
  const dbClient = await createClient();
  const { data: employee, error } = await dbClient
    .from("employees")
    .select("has_approval, role, rejection_reason")
    .eq("id", user.id)
    .single();

  const isOnboardingRoute = currentPath === "/onboarding";

  // If no employee record found, redirect to onboarding
  if (!employee || error) {
    if (!isOnboardingRoute) {
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
    return response;
  }

  const { has_approval, role: queriedRole, rejection_reason } = employee;
  const role = queriedRole as Role;

  // Handle pending approval state
  if (has_approval === "PENDING") {
    if (
      !url.searchParams.has("status") ||
      url.searchParams.get("status") !== "pending"
    ) {
      url.pathname = "/onboarding";
      url.searchParams.set("status", "pending");
      return NextResponse.redirect(url);
    }

    // Prevent user from accessing onboarding page content with wrong status
    if (isOnboardingRoute && url.searchParams.get("status") !== "pending") {
      url.pathname = "/onboarding";
      url.searchParams.set("status", "pending");
      return NextResponse.redirect(url);
    }

    return response;
  }

  // Handle rejected approval state
  if (has_approval === "REJECTED") {
    if (
      !url.searchParams.has("status") ||
      url.searchParams.get("status") !== "rejected"
    ) {
      url.pathname = "/onboarding";
      url.searchParams.set("status", "rejected");
      // Include rejection reason in query params if available
      if (rejection_reason) {
        url.searchParams.set("reason", rejection_reason);
      }
      return NextResponse.redirect(url);
    }

    if (isOnboardingRoute && url.searchParams.get("status") !== "rejected") {
      url.pathname = "/onboarding";
      url.searchParams.set("status", "rejected");
      // Include rejection reason in query params if available
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

  // Role-based access control
  const rolePermissions: Record<Role, string[]> = {
    Employee: employeeRoutes,
    Manager: managerRoutes,
    Admin: adminRoutes,
  };

  const isAllowed = rolePermissions[role]?.some((allowedPath) =>
    currentPath === allowedPath || currentPath.startsWith(`${allowedPath}/`)
  );

  if (!isAllowed) {
    url.pathname = "/unauthorized";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
