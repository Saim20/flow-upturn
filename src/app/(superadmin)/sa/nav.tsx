"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Buildings, GlobeHemisphereWest, Factory, Users, UserGear, House as House, SignOut, X, List, DeviceMobile, UserPlus, ClipboardText } from "@phosphor-icons/react";
import { ROUTES } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  {
    label: "Dashboard",
    href: ROUTES.SUPERADMIN.DASHBOARD,
    icon: House,
  },
  {
    label: "Companies",
    href: ROUTES.SUPERADMIN.COMPANIES,
    icon: Buildings,
  },
  {
    label: "Devices",
    href: ROUTES.SUPERADMIN.DEVICES,
    icon: DeviceMobile,
  },
  {
    label: "Onboarding",
    href: ROUTES.SUPERADMIN.ONBOARDING,
    icon: UserPlus,
  },
  {
    label: "Countries",
    href: ROUTES.SUPERADMIN.COUNTRIES,
    icon: GlobeHemisphereWest,
  },
  {
    label: "Industries",
    href: ROUTES.SUPERADMIN.INDUSTRIES,
    icon: Factory,
  },
  {
    label: "Teams",
    href: ROUTES.SUPERADMIN.TEAMS,
    icon: Users,
  },
  {
    label: "Superadmins",
    href: ROUTES.SUPERADMIN.USERS,
    icon: UserGear,
  },
  {
    label: "Templates",
    href: "/sa/templates",
    icon: ClipboardText,
  },
];

export default function SuperadminNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <nav className="bg-background-primary shadow-sm border-b border-border-primary sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/sa" className="flex items-center gap-2.5">
              <div className="bg-linear-to-br from-primary-600 to-primary-800 text-white px-3 py-1.5 rounded-lg font-bold text-lg shadow-sm">
                SA
              </div>
              <span className="text-xl font-semibold text-foreground-primary hidden sm:block">
                Flow Superadmin
              </span>
            </Link>

            {/* Desktop NavigationArrow */}
            <div className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href ||
                  (item.href !== "/sa" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg
                      transition-all duration-200 text-sm font-medium
                      ${isActive
                        ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600"
                        : "text-foreground-secondary hover:bg-surface-hover hover:text-foreground-primary"
                      }
                    `}
                  >
                    <Icon size={18} weight={isActive ? "fill" : "regular"} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              <Link
                href="/home"
                className="hidden sm:flex items-center gap-2 text-sm text-foreground-secondary hover:text-foreground-primary font-medium px-3 py-2 rounded-lg hover:bg-surface-hover transition-colors"
              >
                <SignOut size={18} />
                <span>Exit to App</span>
              </Link>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-surface-hover transition-colors"
              >
                {mobileMenuOpen ? <X size={24} /> : <List size={24} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile NavigationArrow */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-30 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed top-16 left-0 right-0 bg-background-primary border-b border-border-primary shadow-lg z-30 lg:hidden"
            >
              <div className="container mx-auto px-4 py-3 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href ||
                    (item.href !== "/sa" && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-lg
                        transition-all duration-200 font-medium
                        ${isActive
                          ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600"
                          : "text-foreground-secondary hover:bg-surface-hover hover:text-foreground-primary"
                        }
                      `}
                    >
                      <Icon size={22} weight={isActive ? "fill" : "regular"} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}

                <div className="border-t border-border-primary pt-2 mt-2">
                  <Link
                    href="/home"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground-secondary hover:bg-surface-hover hover:text-foreground-primary transition-colors font-medium"
                  >
                    <SignOut size={22} />
                    <span>Exit to App</span>
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
