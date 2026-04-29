
import { Channel, Order as PurchaseOrder, Company } from './types';

export const generateSlug = (channel: Channel, po: PurchaseOrder, company?: Company) => {
    const companyName = company?.name || 'Kramiz';
    const poNum = po.order_number;
    const groupName = channel.name;

    // Clean up strings to make a valid URL slug
    const clean = (str: string) => str.replace(/[^a-zA-Z0-9]+/g, '');

    return `${clean(companyName)}${clean(poNum)}${clean(groupName)}`;
};

export const findGroupByIdOrSlug = (slug: string | undefined, channels: Channel[], pos: PurchaseOrder[], company?: Company) => {
    if (!slug) return null;

    // First try by exact ID match (backward compatibility and direct links)
    const byId = channels.find(c => c.id === slug || c.id.toString() === slug);
    if (byId) return byId;

    // Then try by slug match
    return channels.find(c => {
        const po = pos.find(p => p.id === c.order_id) || (c as any).order;
        if (!po) return false;
        return generateSlug(c, po, company) === slug;
    });
};
