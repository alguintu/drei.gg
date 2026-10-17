// Page templates: starting points for new pages, one JSON file each in
// src/templates (name, group, description, and the page itself). The desk's
// gallery draws each one live (src/pages/desk/templates.astro), and "new page"
// copies one.
import type { BlockData } from '../blocks/schema';

export type PageTemplate = {
  id: string;
  name: string;
  group: string;
  description: string;
  page: { title: string; template: 'basic'; regions: Record<string, BlockData[]> };
};

const files = import.meta.glob<{ default: Omit<PageTemplate, 'id'> }>('../templates/*.json', { eager: true });

// The order the gallery shows them in.
export const GROUPS = ['Studio', 'Product', 'Launch', 'Personal', 'Utility'];

export const TEMPLATE_LIST: PageTemplate[] = Object.entries(files)
  .map(([path, mod]) => ({ id: path.split('/').pop()!.replace(/\.json$/, ''), ...mod.default }))
  .sort((a, b) => GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) || a.name.localeCompare(b.name));
