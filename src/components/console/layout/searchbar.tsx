import { Command } from 'cmdk';
import { useEffect, useMemo, useState } from 'react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '../../tailgrids/core/input-group';
import { SearchIcon } from './header-icons';
import type { NavSection } from './nav-types';

interface SearchBarProps {
  sections: NavSection[];
  onSelect: (key: string) => void;
}

const KBD = 'rounded border border-card-border bg-card-background px-1.5 py-0.5 font-mono text-[10px] shadow-xs';

// NextAdmin command palette (Ctrl/Cmd+K), searching the role's own pages.
export default function SearchBar({ sections, onSelect }: SearchBarProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const groups = useMemo(() => sections.filter((section) => section.items.length > 0), [sections]);

  const handleSelect = (key: string) => {
    setOpen(false);
    onSelect(key);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex size-10 items-center justify-center rounded-lg border border-card-border bg-card-background text-icon-primary shadow-xs transition-colors outline-none hover:bg-background-gray-primary focus-visible:border-input-primary-focus-border focus-visible:ring-4 focus-visible:ring-input-primary-focus-border/20 xl:hidden"
        aria-label="Tìm kiếm"
      >
        <SearchIcon />
      </button>

      <div className="hidden xl:block">
        <button type="button" onClick={() => setOpen(true)} className="w-full text-left outline-none focus:outline-none">
          <InputGroup className="h-10 cursor-pointer">
            <InputGroupAddon align="inline-start" className="pr-0 text-icon-tertiary">
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Tìm trang..."
              className="pointer-events-none cursor-pointer pl-2 text-sm select-none"
              readOnly
            />
            <InputGroupAddon align="inline-end">
              <div className="rounded-md border border-card-border bg-background-gray-primary/50 px-2 py-0.75 text-xs text-text-tertiary">
                <span className="font-medium">⌘</span> K
              </div>
            </InputGroupAddon>
          </InputGroup>
        </button>
      </div>

      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Tìm kiếm"
        overlayClassName="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity duration-200"
        contentClassName="fixed top-1/2 left-1/2 z-50 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-card-border bg-card-background text-text-primary shadow-2xl overflow-hidden outline-none max-sm:max-w-[calc(100%-2rem)]"
      >
        <div className="border-b border-card-border p-3.5">
          <InputGroup className="h-10">
            <InputGroupAddon align="inline-start" className="pr-0 text-icon-tertiary">
              <SearchIcon />
            </InputGroupAddon>
            <Command.Input
              placeholder="Tìm trang..."
              className="w-full min-w-0 flex-1 border-none bg-transparent pl-2 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:ring-0 focus:outline-none"
            />
            <InputGroupAddon align="inline-end">
              <div className="rounded-md border border-card-border bg-background-gray-primary/50 px-2 py-0.75 text-xs text-text-tertiary">
                ESC
              </div>
            </InputGroupAddon>
          </InputGroup>
        </div>

        <Command.List className="scrollbar-thin max-h-96 overflow-y-auto p-2">
          <Command.Empty className="py-8 text-center text-sm text-text-tertiary">Không tìm thấy trang phù hợp.</Command.Empty>
          {groups.map((section) => (
            <Command.Group
              key={section.label}
              heading={section.label}
              className="py-1.5 **:[[cmdk-group-heading]]:px-3 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-[11px] **:[[cmdk-group-heading]]:font-semibold **:[[cmdk-group-heading]]:tracking-wider **:[[cmdk-group-heading]]:text-text-tertiary **:[[cmdk-group-heading]]:uppercase"
            >
              {section.items.map((item) => (
                <Command.Item
                  key={item.key}
                  value={`${section.label} ${item.title}`}
                  onSelect={() => handleSelect(item.key)}
                  className="flex cursor-pointer items-center rounded-lg px-3 py-2.5 text-sm text-text-secondary transition-colors hover:bg-background-gray-primary data-[selected=true]:bg-background-gray-primary data-[selected=true]:text-text-primary"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex size-5 shrink-0 items-center justify-center text-icon-secondary">
                      <item.icon size={20} />
                    </span>
                    <span className="truncate text-text-primary">{item.title}</span>
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>

        <div className="flex items-center justify-between border-t border-card-border bg-background-gray-primary/40 px-4 py-2.5 text-xs text-text-tertiary">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className={KBD}>↑</kbd>
              <kbd className={KBD}>↓</kbd>
              <span>Di chuyển</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className={KBD}>↵</kbd>
              <span>Chọn</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className={KBD}>ESC</kbd>
            <span>Đóng</span>
          </div>
        </div>
      </Command.Dialog>
    </>
  );
}
