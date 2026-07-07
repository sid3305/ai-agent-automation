'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Workflow,
  ListChecks,
  Bot,
  ScrollText,
  Clock12,
  ChevronLeft,
  Menu,
  X,
  FlaskConical,
  Brain,
  FileText,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { UserProfileMenu } from '@/components/user-profile-menu';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef, startTransition } from 'react';
import { ReportIssueDialog } from '@/components/report-issue-dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';

const coreNavItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Workflows', href: '/workflows', icon: Workflow },
  { name: 'Agents', href: '/agents', icon: Bot },
  { name: 'Tasks', href: '/tasks', icon: ListChecks },
  { name: 'Agent Playground', href: '/playground', icon: FlaskConical },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Memory', href: '/memory', icon: Brain },
  { name: 'Schedules', href: '/schedules', icon: Clock12 },
];

const systemNavItems = [
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Logs', href: '/logs', icon: ScrollText },
];

const SIDEBAR_EXPANDED = 256;
const SIDEBAR_COLLAPSED = 72;

/* ── Shared sidebar inner content ── */
function SidebarContent({
  collapsed,
  mobileOpen,
  onCollapse,
  onMobileClose,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  onCollapse: () => void;
  onMobileClose: () => void;
}) {
  const pathname = usePathname();
  const showLabels = !collapsed || mobileOpen;

  const renderNavItem = (item: { name: string; href: string; icon: any }) => {
    const isActive =
      pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          isActive
            ? 'bg-sidebar-accent/80 text-sidebar-foreground'
            : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground'
        )}
      >
        {/* Active Indicator */}
        {isActive && (
          <motion.div
            layoutId="active-nav-indicator"
            className="absolute left-0 top-1/2 h-3/5 w-1 -translate-y-1/2 rounded-r-full bg-primary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
        )}
        
        <item.icon
          className={cn(
            'size-4 shrink-0 transition-colors',
            isActive ? 'text-primary' : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground/90'
          )}
        />
        <AnimatePresence>
          {showLabels && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.15 }}
              className="whitespace-nowrap"
            >
              {item.name}
            </motion.span>
          )}
        </AnimatePresence>
      </Link>
    );
  };

  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Header */}
      <div className="flex h-16 shrink-0 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3 overflow-hidden">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 border border-primary/20">
            <Bot className="size-4 text-primary" />
          </div>
          <AnimatePresence>
            {showLabels && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex flex-col whitespace-nowrap"
              >
                <span className="text-sm font-bold text-sidebar-foreground tracking-tight">
                  AI Workbench
                </span>
                <span className="text-[9px] font-bold tracking-[0.15em] text-sidebar-foreground/50 uppercase leading-tight">
                  Automation Engine
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>

        {/* Desktop collapse button */}
        <button
          onClick={onCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden md:flex shrink-0 items-center justify-center rounded-md p-1.5 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ChevronLeft className={cn('size-4 transition-transform duration-300', collapsed && 'rotate-180')} />
        </button>

        {/* Mobile close button (using Sheet close internally, but keeping button for layout if needed, though we can hide it) */}
        <button
          onClick={onMobileClose}
          aria-label="Close sidebar"
          className="md:hidden shrink-0 items-center justify-center rounded-md p-1.5 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none px-2 py-4 flex flex-col gap-6">
        <nav className="flex flex-col gap-1">
          {coreNavItems.map(renderNavItem)}
        </nav>

        <div className="flex flex-col gap-2">
          {showLabels && (
            <div className="px-3 text-[10px] font-bold tracking-[0.1em] text-sidebar-foreground/50 uppercase">
              System
            </div>
          )}
          <nav className="flex flex-col gap-1">
            {systemNavItems.map(renderNavItem)}
          </nav>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto flex flex-col gap-1 border-t border-border px-2 py-4">
        <button className="group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <HelpCircle className="size-4 shrink-0 text-sidebar-foreground/60 group-hover:text-sidebar-foreground/90" />
          <AnimatePresence>
            {showLabels && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="whitespace-nowrap"
              >
                Help
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <ReportIssueDialog collapsed={!showLabels} />

        <div className="pt-2 mt-2 border-t border-border">
          <UserProfileMenu collapsed={!showLabels} />
        </div>
      </div>
    </div>
  );
}

/* ── Main exported component ── */
export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathnameRef = useRef(pathname);

  /* Sync layout padding for desktop */
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-width',
      collapsed ? `${SIDEBAR_COLLAPSED}px` : `${SIDEBAR_EXPANDED}px`
    );
  }, [collapsed]);

  /* Close mobile drawer on route change */
  useEffect(() => {
    if (pathnameRef.current !== pathname) {
      pathnameRef.current = pathname;
      startTransition(() => setMobileOpen(false));
    }
  }, [pathname]);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open sidebar"
        aria-expanded={mobileOpen}
        aria-controls="mobile-sidebar-menu"
        className="md:hidden fixed top-4 left-4 z-40 rounded-md p-2 bg-sidebar border border-border text-sidebar-foreground shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Menu className="size-5" />
      </button>

      {/* Mobile drawer (Accessible) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64 [&>button]:hidden" id="mobile-sidebar-menu">
          <SidebarContent
            collapsed={false}
            mobileOpen={true}
            onCollapse={() => setCollapsed((v) => !v)}
            onMobileClose={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="hidden md:block fixed left-0 top-0 z-30 h-screen border-r border-border/40 bg-sidebar"
      >
        <SidebarContent
          collapsed={collapsed}
          mobileOpen={false}
          onCollapse={() => setCollapsed((v) => !v)}
          onMobileClose={() => setMobileOpen(false)}
        />
      </motion.aside>
    </>
  );
}
