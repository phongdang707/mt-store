export const itemName = (i: { name: string; variantName?: string }) => (i.variantName ? `${i.name} – ${i.variantName}` : i.name);
