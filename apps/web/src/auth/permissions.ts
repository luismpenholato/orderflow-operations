import { UserRole, type UserRole as UserRoleType } from "@orderflow/contracts";

export interface NavItem {
  path: string;
  label: string;
  roles: UserRoleType[];
  end?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    path: "/",
    label: "Dashboard",
    roles: [UserRole.MANAGER, UserRole.FINANCE],
    end: true,
  },
  { path: "/customers", label: "Customers", roles: [UserRole.SALES, UserRole.MANAGER] },
  { path: "/products", label: "Products", roles: [UserRole.MANAGER] },
  { path: "/inventory", label: "Inventory", roles: [UserRole.MANAGER] },
  {
    path: "/orders",
    label: "Orders",
    roles: [UserRole.SALES, UserRole.MANAGER, UserRole.FINANCE],
  },
  { path: "/orders/new", label: "New order", roles: [UserRole.SALES, UserRole.MANAGER] },
  { path: "/integrations", label: "Integrations", roles: [UserRole.MANAGER] },
];

export function getDefaultRouteForRole(role: UserRoleType): string {
  return role === UserRole.SALES ? "/orders" : "/";
}

export function canAccessRoute(role: UserRoleType | undefined, path: string): boolean {
  if (!role) return false;
  const item = [...NAV_ITEMS]
    .sort((a, b) => b.path.length - a.path.length)
    .find((nav) => path === nav.path || path.startsWith(`${nav.path}/`));
  if (!item) return true;
  return item.roles.includes(role);
}

export function getNavItemsForRole(role: UserRoleType): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export const ROLE_LABELS: Record<UserRoleType, string> = {
  [UserRole.SALES]: "Sales",
  [UserRole.MANAGER]: "Manager",
  [UserRole.FINANCE]: "Finance",
};
