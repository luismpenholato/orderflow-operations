import { describe, expect, it } from "vitest";
import {
  calculateAvailable,
  calculateKitAvailable,
  consolidateComponents,
  expandKitComponents,
  type KitMap,
} from "./inventory-calculations.js";

describe("inventory-calculations", () => {
  it("calculates available quantity as on-hand minus reserved", () => {
    expect(calculateAvailable(10, 3)).toBe(7);
    expect(calculateAvailable(0, 0)).toBe(0);
  });

  it("expands kit line items into component requirements", () => {
    const kitMap: KitMap = new Map([
      [
        "kit-1",
        [
          { componentProductId: "comp-a", quantity: 2 },
          { componentProductId: "comp-b", quantity: 1 },
        ],
      ],
    ]);

    const expanded = expandKitComponents([{ productId: "kit-1", quantity: 3 }], kitMap);

    expect(expanded).toEqual([
      { productId: "comp-a", quantity: 6 },
      { productId: "comp-b", quantity: 3 },
    ]);
  });

  it("passes through simple products without expansion", () => {
    const expanded = expandKitComponents([{ productId: "simple-1", quantity: 4 }], new Map());

    expect(expanded).toEqual([{ productId: "simple-1", quantity: 4 }]);
  });

  it("consolidates duplicate component requirements", () => {
    const consolidated = consolidateComponents([
      { productId: "b-comp", quantity: 2 },
      { productId: "a-comp", quantity: 1 },
      { productId: "b-comp", quantity: 3 },
    ]);

    expect(consolidated).toEqual([
      { productId: "a-comp", quantity: 1 },
      { productId: "b-comp", quantity: 5 },
    ]);
  });

  it("calculates kit availability from limiting component", () => {
    const availability = new Map([
      ["comp-a", 10],
      ["comp-b", 5],
    ]);

    const kits = calculateKitAvailable(
      [
        { componentProductId: "comp-a", quantity: 2 },
        { componentProductId: "comp-b", quantity: 1 },
      ],
      availability,
    );

    expect(kits).toBe(5);
  });

  it("returns zero kit availability when a kit has no components", () => {
    expect(calculateKitAvailable([], new Map())).toBe(0);
  });
});
