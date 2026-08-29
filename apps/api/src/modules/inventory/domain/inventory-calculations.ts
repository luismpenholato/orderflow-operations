export interface OrderLineItem {
  productId: string;
  quantity: number;
}

export interface KitComponentDefinition {
  componentProductId: string;
  quantity: number;
}

export type KitMap = Map<string, KitComponentDefinition[]>;

export function calculateAvailable(onHand: number, reserved: number): number {
  return onHand - reserved;
}

export function expandKitComponents(items: OrderLineItem[], kitMap: KitMap): OrderLineItem[] {
  const expanded: OrderLineItem[] = [];

  for (const item of items) {
    const components = kitMap.get(item.productId);
    if (components && components.length > 0) {
      for (const component of components) {
        expanded.push({
          productId: component.componentProductId,
          quantity: item.quantity * component.quantity,
        });
      }
    } else {
      expanded.push({ productId: item.productId, quantity: item.quantity });
    }
  }

  return expanded;
}

export function consolidateComponents(components: OrderLineItem[]): OrderLineItem[] {
  const consolidated = new Map<string, number>();

  for (const component of components) {
    consolidated.set(
      component.productId,
      (consolidated.get(component.productId) ?? 0) + component.quantity,
    );
  }

  return Array.from(consolidated.entries())
    .map(([productId, quantity]) => ({ productId, quantity }))
    .sort((a, b) => a.productId.localeCompare(b.productId));
}

export function calculateKitAvailable(
  components: KitComponentDefinition[],
  componentAvailability: Map<string, number>,
): number {
  if (components.length === 0) {
    return 0;
  }

  let kitAvailable = Infinity;

  for (const component of components) {
    const available = componentAvailability.get(component.componentProductId) ?? 0;
    const kitsFromComponent = Math.floor(available / component.quantity);
    kitAvailable = Math.min(kitAvailable, kitsFromComponent);
  }

  return kitAvailable === Infinity ? 0 : kitAvailable;
}
