"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Bell,
  Check,
  ChevronRight,
  CircleHelp,
  Download,
  ExternalLink,
  Gem,
  Gift,
  Laptop,
  LogOut,
  MoonStar,
  Palette,
  Plus,
  Settings,
  Smile,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useState, type ComponentType } from "react";
import { cn } from "@/lib/utils";
import type { PlanCode } from "@/types/subscription";

type MenuIcon = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

export interface AccountMenuAccount {
  id: string;
  name: string;
  email: string;
  avatarGradient?: string;
  shortcut?: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: MenuIcon;
  badge?: string;
  badgeTone?: "neutral" | "success";
  external?: boolean;
  action?: () => void;
}

export interface UserAccountMenuProps {
  user: AccountMenuAccount;
  accounts?: AccountMenuAccount[];
  activeAccountId?: string;
  status?: string;
  notificationCount?: number;
  currentPlan?: PlanCode | null;
  onSelectAccount?: (account: AccountMenuAccount) => void;
  onAddAccount?: () => void;
  canAddAccount?: boolean;
  addAccountLabel?: string;
  addAccountDisabledReason?: string;
  onUpdateStatus?: () => void;
  onSwitchSpace?: () => void;
  onLogout?: () => void;
  onMenuAction?: (actionId: string) => void;
  loggingOut?: boolean;
  className?: string;
}

const DEFAULT_GRADIENT = "from-[#17b897] via-[#4f7cff] to-[#f3bd42]";

function Avatar({
  account,
  className,
}: {
  account: AccountMenuAccount;
  className?: string;
}) {
  const initials = account.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-bold text-white shadow-sm ring-1 ring-black/5",
        account.avatarGradient ?? DEFAULT_GRADIENT,
        className,
      )}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

function ShortcutBadge({ children }: { children: string }) {
  return (
    <span className="ml-auto grid min-w-5 place-items-center rounded-md border border-border/80 bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold leading-4 text-muted-foreground shadow-[0_1px_1px_rgba(15,23,42,0.04)]">
      {children}
    </span>
  );
}

function MenuRow({ item, onAction }: { item: MenuItem; onAction: (item: MenuItem) => void }) {
  const Icon = item.icon;

  return (
    <DropdownMenu.Item
      onSelect={() => onAction(item)}
      className="group/menu-item flex min-h-10 cursor-pointer select-none items-center gap-3 rounded-xl px-2.5 text-[13px] font-medium text-foreground outline-none transition-colors duration-150 data-[highlighted]:bg-muted data-[highlighted]:text-foreground"
    >
      <Icon className="size-[17px] shrink-0 text-muted-foreground transition-colors group-data-[highlighted]/menu-item:text-foreground" aria-hidden />
      <span>{item.label}</span>
      {item.badge && (
        <span
          className={cn(
            "ml-auto rounded-md px-1.5 py-0.5 text-[9px] font-bold leading-4",
            item.badgeTone === "success"
              ? "bg-success text-success-foreground"
              : "border bg-background text-muted-foreground",
          )}
        >
          {item.badge}
        </span>
      )}
      {item.external && <ExternalLink className="ml-auto size-3.5 text-muted-foreground" aria-hidden />}
    </DropdownMenu.Item>
  );
}

export function UserAccountMenu({
  user,
  accounts = [user],
  activeAccountId: controlledActiveAccountId,
  status = "Online",
  notificationCount = 0,
  currentPlan,
  onSelectAccount,
  onAddAccount,
  canAddAccount = true,
  addAccountLabel = "Add new account",
  addAccountDisabledReason,
  onUpdateStatus,
  onSwitchSpace,
  onLogout,
  onMenuAction,
  loggingOut = false,
  className,
}: UserAccountMenuProps) {
  const [selectedAccountId, setSelectedAccountId] = useState(controlledActiveAccountId ?? user.id);
  const activeAccountId = controlledActiveAccountId ?? selectedAccountId;
  const planMenuItem: MenuItem = currentPlan === "PREMIUM"
    ? { id: "billing-plan", label: "Premium plan active", icon: Gem, badge: "Active", badgeTone: "success" }
    : currentPlan
      ? { id: "billing-plan", label: "Upgrade to Premium", icon: Gem, badge: `${currentPlan === "BASIC" ? "Basic" : "Plus"} plan` }
      : { id: "billing-plan", label: "View plans", icon: Gem };

  const menuGroups: MenuItem[][] = [
    [
      { id: "profile", label: "Your profile", icon: UserRound, badge: "1" },
      { id: "appearance", label: "Appearance", icon: Palette, badge: "2" },
      { id: "settings", label: "Settings", icon: Settings, badge: "3" },
      {
        id: "notifications",
        label: "Notifications",
        icon: Bell,
        badge: notificationCount > 0 ? String(notificationCount) : undefined,
      },
    ],
    [
      planMenuItem,
      { id: "referrals", label: "Referrals", icon: Gift },
    ],
    [
      { id: "download", label: "Download app", icon: Download },
      { id: "whats-new", label: "What’s new?", icon: Laptop, external: true },
      { id: "help", label: "Get help?", icon: CircleHelp, external: true },
    ],
  ];

  const handleAction = (item: MenuItem) => {
    item.action?.();
    onMenuAction?.(item.id);
  };

  const handleAccountSelect = (account: AccountMenuAccount) => {
    setSelectedAccountId(account.id);
    onSelectAccount?.(account);
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            "group relative grid size-10 place-items-center rounded-full outline-none transition-transform duration-200 hover:scale-[1.04] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=open]:scale-[1.04]",
            className,
          )}
          aria-label={`Open account menu for ${user.name}`}
        >
          <Avatar account={user} className="size-9 text-[11px] ring-2 ring-card" />
          <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-card bg-success" aria-label={status} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={10}
          align="end"
          collisionPadding={16}
          className="account-menu-content z-50 w-[292px] overflow-visible rounded-[20px] border border-border/80 bg-popover/95 p-1.5 text-popover-foreground shadow-[0_18px_55px_rgba(20,35,27,0.16),0_3px_10px_rgba(20,35,27,0.06)] backdrop-blur-xl outline-none"
        >
          <div className="flex items-center gap-3 px-2.5 pb-1.5 pt-2">
            <Avatar account={user} className="size-9 text-[11px]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold leading-5">{user.name}</p>
              <p className="truncate text-[11px] leading-4 text-muted-foreground">{user.email}</p>
            </div>
            <span className="rounded-full bg-secondary px-2 py-1 text-[9px] font-bold text-secondary-foreground">
              {status}
            </span>
          </div>

          <DropdownMenu.Item
            onSelect={onUpdateStatus}
            className="flex min-h-10 cursor-pointer select-none items-center gap-3 rounded-xl px-2.5 text-[13px] font-medium outline-none transition-colors data-[highlighted]:bg-muted"
          >
            <Smile className="size-[17px] text-muted-foreground" aria-hidden />
            <span>Update status</span>
            <ChevronRight className="ml-auto size-3.5 text-muted-foreground" aria-hidden />
          </DropdownMenu.Item>

          {menuGroups.map((group) => (
            <div key={group[0].id}>
              <DropdownMenu.Separator className="my-1 h-px bg-border/70" />
              {group.map((item) => <MenuRow key={item.id} item={item} onAction={handleAction} />)}
            </div>
          ))}

          <DropdownMenu.Separator className="my-1 h-px bg-border/70" />
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger className="flex min-h-10 cursor-pointer select-none items-center gap-3 rounded-xl bg-muted/80 px-2.5 text-[13px] font-semibold outline-none transition-colors data-[state=open]:bg-secondary data-[state=open]:text-secondary-foreground data-[highlighted]:bg-secondary data-[highlighted]:text-secondary-foreground">
              <UsersRound className="size-[17px] text-muted-foreground" aria-hidden />
              <span>Switch account</span>
              <ShortcutBadge>S</ShortcutBadge>
            </DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent
                sideOffset={10}
                alignOffset={-6}
                collisionPadding={16}
                className="account-menu-content z-[60] w-[256px] rounded-[18px] border border-border/80 bg-popover/95 p-1.5 text-popover-foreground shadow-[0_18px_55px_rgba(20,35,27,0.16),0_3px_10px_rgba(20,35,27,0.06)] backdrop-blur-xl outline-none"
              >
                <p className="px-2.5 pb-1.5 pt-2 text-[11px] font-semibold text-muted-foreground">Business profiles</p>
                {accounts.map((account, index) => (
                  <DropdownMenu.Item
                    key={account.id}
                    onSelect={() => handleAccountSelect(account)}
                    className="flex min-h-10 cursor-pointer select-none items-center gap-2.5 rounded-xl px-2.5 text-[12px] font-semibold outline-none transition-colors data-[highlighted]:bg-muted"
                  >
                    <Avatar account={account} className="size-6 text-[8px]" />
                    <span className="min-w-0 flex-1 truncate">{account.name}</span>
                    {activeAccountId === account.id && <Check className="size-3.5 text-primary" aria-label="Current account" />}
                    <ShortcutBadge>{account.shortcut ?? `⌘${index + 1}`}</ShortcutBadge>
                  </DropdownMenu.Item>
                ))}
                <DropdownMenu.Separator className="my-1 h-px bg-border/70" />
                <DropdownMenu.Item
                  disabled={!canAddAccount}
                  onSelect={onAddAccount}
                  className="flex min-h-10 cursor-pointer select-none items-center gap-2.5 rounded-xl px-2.5 text-[12px] font-semibold outline-none transition-colors data-[highlighted]:bg-muted data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
                >
                  <span className="grid size-6 place-items-center rounded-full border bg-card">
                    <Plus className="size-3.5" aria-hidden />
                  </span>
                  <span>{addAccountLabel}</span>
                  <ShortcutBadge>⌘P</ShortcutBadge>
                </DropdownMenu.Item>
                {!canAddAccount && addAccountDisabledReason && (
                  <p className="px-2.5 pb-2 pt-1 text-[10px] leading-4 text-muted-foreground">{addAccountDisabledReason}</p>
                )}
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>

          <DropdownMenu.Item
            onSelect={onSwitchSpace}
            className="flex min-h-10 cursor-pointer select-none items-center gap-3 rounded-xl px-2.5 text-[13px] font-medium outline-none transition-colors data-[highlighted]:bg-muted"
          >
            <MoonStar className="size-[17px] text-muted-foreground" aria-hidden />
            <span>Switch space</span>
            <span className="ml-auto size-4 rounded-[5px] bg-gradient-to-br from-[#20c997] via-[#6c63ff] to-[#ffc857] shadow-sm" aria-hidden />
          </DropdownMenu.Item>
          <DropdownMenu.Item
            disabled={loggingOut}
            onSelect={onLogout}
            className="flex min-h-10 cursor-pointer select-none items-center gap-3 rounded-xl px-2.5 text-[13px] font-medium outline-none transition-colors data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
          >
            <LogOut className="size-[17px] text-muted-foreground" aria-hidden />
            <span>{loggingOut ? "Signing out…" : "Log out"}</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
