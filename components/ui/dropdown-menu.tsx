'use client';

import * as React from "react"
import { cn } from "@/lib/utils"

interface DropdownMenuProps {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: "start" | "end"
}

export function DropdownMenu({ trigger, children, align = "start" }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div onClick={() => setOpen(!open)}>
        {trigger}
      </div>

      {open && (
        <div
          className={cn(
            "absolute z-50 mt-2 min-w-[8rem] overflow-hidden rounded-md border border-gray-200 bg-white p-1 shadow-lg",
            align === "end" ? "right-0" : "left-0"
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}

interface DropdownMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function DropdownMenuItem({ children, className, ...props }: DropdownMenuItemProps) {
  return (
    <div
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 focus:bg-gray-100",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function DropdownMenuSeparator() {
  return <div className="my-1 h-px bg-gray-200" />
}

export function DropdownMenuLabel({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("px-2 py-1.5 text-sm font-semibold", className)}>
      {children}
    </div>
  )
}

interface DropdownMenuCheckboxItemProps extends React.HTMLAttributes<HTMLDivElement> {
  checked?: boolean
  children: React.ReactNode
}

export function DropdownMenuCheckboxItem({ checked, children, className, ...props }: DropdownMenuCheckboxItemProps) {
  return (
    <div
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors hover:bg-gray-100 focus:bg-gray-100",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {checked && (
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </span>
      {children}
    </div>
  )
}
