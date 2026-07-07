"use client";

import { useContext } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/context/AuthContext";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Button } from "@/components/ui/button";
import { LogOut, User, Settings } from "lucide-react";

type Props = {
  collapsed?: boolean;
};

export function UserProfileMenu({ collapsed = false }: Props) {
  // ✅ hooks ALWAYS run
  const auth = useContext(AuthContext);
  const router = useRouter();

  // ✅ derive state AFTER hooks
  const user = auth?.user;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="group flex w-full items-center justify-start gap-3 rounded-md px-3 py-2.5 h-auto hover:bg-sidebar-accent/40 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          disabled={!user}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
            {(user?.name || user?.email || "U")[0].toUpperCase()}
          </div>

          {/* Hide text when collapsed */}
          {!collapsed && (
            <>
              <div className="flex flex-col items-start text-sm overflow-hidden text-ellipsis whitespace-nowrap flex-1">
                <span className="font-medium text-sidebar-foreground truncate w-full text-left">
                  {user?.name || "User"}
                </span>
                <span className="text-[11px] text-muted-foreground truncate w-full text-left">
                  Pro Plan
                </span>
              </div>
              <Settings className="size-4 shrink-0 text-muted-foreground group-hover:text-sidebar-foreground transition-colors duration-200" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      {/* Menu only opens if user exists */}
      {user && (
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem disabled>
            <User className="mr-2 size-4" />
            Account
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => router.push("/settings")}>
            <Settings className="mr-2 size-4" />
            Settings
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={auth.logout}
          >
            <LogOut className="mr-2 size-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}
