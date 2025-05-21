import {
    UserCircle as UserCircleIcon,
    ShoppingBag as ShoppingBagIcon,
    GridFour as GridFourIcon,
    NotePencil as NotePencilIcon,
    Envelope as EnvelopeIcon,
    Scroll as ScrollIcon,
    UserGear as UserGearIcon,
    MagnifyingGlass as MagnifyingGlassIcon,
    User as UserIcon,
    Bell as BellIcon,
  } from "@phosphor-icons/react/dist/ssr";
import { adminRoutes, employeeRoutes, managerRoutes } from "@/lib/utils/path-utils";

export type NavItem = {
  label: string;
  href: string;
  icon: any;
  roles?: string[];  // Which roles can access this item
};

export const navItems: NavItem[] = [
    {
      label: "home",
      href: "/home",
      icon: GridFourIcon, 
      roles: ["Employee", "Manager", "Admin"],
    },
    {
      label: "hris",
      href: "/hris",
      icon: UserCircleIcon,
      roles: ["Manager", "Admin"],
    },
    {
      label: "operations-and-services",
      href: "/operations-and-services",
      icon: EnvelopeIcon,
      roles: ["Employee", "Manager", "Admin"],
    },
    {
      label: "notifications",
      href: "/notifications",
      icon: BellIcon,
      roles: ["Employee", "Manager", "Admin"],
    },
    {
      label: "finder",
      href: "/finder",
      icon: MagnifyingGlassIcon,
      roles: ["Manager", "Admin"],
    },
    {
      label: "admin-management",
      href: "/admin-management",
      icon: UserGearIcon,
      roles: ["Admin"],
    },
    {
      label: "account",
      href: "/account",
      icon: UserIcon,
      roles: ["Employee", "Manager", "Admin"],
    },
  ];