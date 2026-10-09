import { useState } from 'react';
import { Header as AriaHeader, Heading } from 'react-aria-components';
import { cn } from '../../../lib/cn';
import { Button } from '../../tailgrids/core/button';
import { OverlayWrapper } from '../../tailgrids/core/overlay';
import { Popover } from '../../tailgrids/core/popover';
import { ScrollArea, ScrollAreaViewport, ScrollBar } from '../../tailgrids/core/scroll-area';
import { BellIcon } from './header-icons';

export interface NotificationItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  timestamp: string;
  isUnread?: boolean;
}

export interface NotificationGroup {
  title: string;
  items: NotificationItem[];
}

// NextAdmin notifications popover. The backend has no notification feed yet,
// so groups default to empty and the popover shows an empty state.
export function NotificationsButton({ groups = [] }: { groups?: NotificationGroup[] }) {
  const [notifications, setNotifications] = useState(groups);
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.flatMap((group) => group.items).filter((item) => item.isUnread).length;

  const markAsRead = (id: string) =>
    setNotifications((prev) =>
      prev.map((group) => ({
        ...group,
        items: group.items.map((item) => (item.id === id ? { ...item, isUnread: false } : item)),
      })),
    );

  const markAllAsRead = () =>
    setNotifications((prev) => prev.map((group) => ({ ...group, items: group.items.map((item) => ({ ...item, isUnread: false })) })));

  return (
    <OverlayWrapper isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button
        iconOnly
        appearance="outline"
        aria-label="Thông báo"
        className="relative size-10 rounded-lg border border-card-border bg-card-background text-icon-primary shadow-xs focus-visible:border-input-primary-focus-border focus-visible:ring-4 focus-visible:ring-input-primary-focus-border/20 [&>svg]:size-auto"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className={cn('absolute top-2 right-2.75 z-1 size-2 rounded-full bg-red-400')}>
            <span className="absolute inset-0 -z-1 animate-ping rounded-full bg-red-400 opacity-75" />
          </span>
        )}
      </Button>

      <Popover
        placement="bottom end"
        className="w-84.5 overflow-hidden rounded-2xl border border-border-secondary-alt bg-background-white-secondary p-0 shadow-3xl"
      >
        <AriaHeader className="flex items-center justify-between border-b border-border-secondary-alt px-5 pt-5 pb-4">
          <Heading level={4} className="leading-6 font-semibold text-text-primary">
            Thông báo
          </Heading>
        </AriaHeader>

        {notifications.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-text-tertiary">Chưa có thông báo nào.</p>
        ) : (
          <>
            <ScrollArea className="h-100 max-h-100">
              <ScrollAreaViewport>
                {notifications.map((group) => (
                  <section key={group.title}>
                    <div className="border-t border-b border-border-primary bg-background-gray-secondary px-5 py-2">
                      <p className="text-xs leading-4 text-text-tertiary uppercase">{group.title}</p>
                    </div>
                    <ul className="flex-1 overflow-y-auto px-3 py-2">
                      {group.items.map((notification) => (
                        <li key={notification.id}>
                          <button
                            type="button"
                            className="group flex w-full cursor-pointer gap-3.5 rounded-lg px-3 py-3 transition-colors duration-300 hover:bg-background-gray-secondary_alt"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-secondary bg-background-gray-primary text-icon-secondary transition-all duration-300 group-hover:bg-brand-500 group-hover:text-base-white group-hover:shadow-[0_1px_3px_0.5px_rgba(13,13,18,0.08)]">
                              {notification.icon}
                            </span>
                            <div className="min-w-0 flex-1 text-start">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm leading-5 font-semibold text-text-primary">{notification.title}</p>
                                {notification.isUnread && <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />}
                              </div>
                              <p className="mt-1 line-clamp-2 text-xs leading-4 text-text-secondary">{notification.description}</p>
                              <p className="mt-2 text-xs leading-4 text-text-tertiary">{notification.timestamp}</p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </ScrollAreaViewport>
              <ScrollBar />
            </ScrollArea>
            <div className="flex items-center justify-between border-t border-border-secondary-alt px-5 py-4">
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs font-medium text-text-secondary underline transition-colors hover:text-text-primary"
              >
                Đánh dấu đã đọc tất cả
              </button>
            </div>
          </>
        )}
      </Popover>
    </OverlayWrapper>
  );
}
