import { describe, expect, it } from "vitest";
import { UserRole } from "@orderflow/contracts";
import { canAccessRoute, getDefaultRouteForRole, getNavItemsForRole } from "./permissions";

describe("frontend role navigation", () => {
  it("routes sales users to orders instead of the financial dashboard", () => {
    expect(getDefaultRouteForRole(UserRole.SALES)).toBe("/orders");
    expect(canAccessRoute(UserRole.SALES, "/")).toBe(false);
    expect(canAccessRoute(UserRole.SALES, "/orders")).toBe(true);
  });

  it("keeps the integration monitor exclusive to managers", () => {
    expect(canAccessRoute(UserRole.MANAGER, "/integrations")).toBe(true);
    expect(canAccessRoute(UserRole.FINANCE, "/integrations")).toBe(false);
    expect(getNavItemsForRole(UserRole.FINANCE).map((item) => item.path)).not.toContain(
      "/integrations",
    );
  });

  it("uses the most specific permission for nested order routes", () => {
    expect(canAccessRoute(UserRole.FINANCE, "/orders/8ad8608f")).toBe(true);
    expect(canAccessRoute(UserRole.FINANCE, "/orders/new")).toBe(false);
  });
});
