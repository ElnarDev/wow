import type { CategoryGroup } from '../types';

type Props = {
  categories: string[];
  supportedCategories: Set<string>;
  activeCategory: string;
  activeGroup: string | null;
  activeLeaf: string | null;
  groups: CategoryGroup[];
  disabled: boolean;
  label: (value: string) => string;
  onCategoryChange: (category: string) => void;
  onGroupChange: (group: string | null) => void;
  onLeafChange: (leaf: string | null) => void;
};

export function AuctionSidebar({ categories, supportedCategories, activeCategory, activeGroup, activeLeaf, groups, disabled, label, onCategoryChange, onGroupChange, onLeafChange }: Props) {
  return <aside className="overflow-y-auto rounded-[5px] border border-[#151312] bg-[#181514] p-1.5 shadow-inner shadow-black/80">
    {categories.map((category) => <div key={category} className="mb-1">
      <button disabled={disabled} onClick={() => onCategoryChange(category)} className={`block w-full rounded-[4px] border px-2 py-1 text-left font-serif text-sm leading-4 disabled:cursor-wait disabled:opacity-50 ${activeCategory === category ? 'border-[#d4ce63] bg-[#353127] text-[#f8e95c] shadow-[inset_0_0_10px_#b6b43b]' : 'border-[#292522] bg-[#2c2826] text-[#f3ce49] hover:bg-[#383230]'}`}>{label(category)}</button>
      {category !== 'WoW Token' && supportedCategories.has(activeCategory) && category === activeCategory && groups.map((group) => {
        const selected = activeGroup === group.label;
        return <div key={group.label}>
          <button onClick={() => onGroupChange(selected ? null : group.label)} className={`mt-0.5 ml-3 block w-[calc(100%-0.75rem)] rounded border px-2 py-0.5 text-left font-serif text-[13px] ${selected ? 'border-[#d4ce63] bg-[#353127] text-[#f8e95c] shadow-[inset_0_0_8px_#b6b43b]' : 'border-[#292522] bg-[#2c2826] text-[#e4e0d8] hover:border-[#aaa4df]'}`}>{label(group.label)}</button>
          {selected && group.leaves.map((leaf) => <button key={leaf.label} title={leaf.kind === 'special' ? 'Filter pending verified Runecarving data.' : undefined} onClick={() => onLeafChange(activeLeaf === leaf.label ? null : leaf.label)} className={`relative ml-5 block w-[calc(100%-1.25rem)] py-0.5 pl-4 pr-1 text-left font-serif text-[13px] before:absolute before:left-0 before:text-[#6f6862] before:content-['└'] ${activeLeaf === leaf.label ? 'bg-gradient-to-r from-[#56518e] via-[#45406f] to-transparent text-white' : leaf.kind === 'special' ? 'text-[#18c9ff]' : leaf.kind === 'tertiary' ? 'text-[#32ff2b]' : 'text-[#ddd8cf]'}`}>{label(leaf.label)}</button>)}
        </div>;
      })}
    </div>)}
  </aside>;
}
