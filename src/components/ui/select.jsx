"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { Drawer as DrawerPrimitive } from "vaul"

import { cn } from "@/lib/utils"

// ─── Mobile detection ──────────────────────────────────────────────────────────
const isMobileDevice = () =>
  typeof window !== 'undefined' && window.innerWidth < 768;

// ─── Radix-based Select (desktop) ─────────────────────────────────────────────
const Select = SelectPrimitive.Root
const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}>
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}>
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn("p-1", position === "popper" &&
          "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]")}>
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props} />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}>
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props} />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName


// ─── Mobile Select: Vaul bottom drawer ────────────────────────────────────────
// Collects MobileSelectItem children to render in a drawer on mobile.
const MobileSelectContext = React.createContext(null);

function MobileSelect({ value, onValueChange, children }) {
  const [open, setOpen] = React.useState(false);

  // Collect items from children tree
  const items = [];
  React.Children.forEach(children, child => {
    collectItems(child, items);
  });

  function collectItems(node, acc) {
    if (!React.isValidElement(node)) return;
    if (node.type === MobileSelectItem || node.props?.['data-mobile-item']) {
      acc.push(node);
    }
    React.Children.forEach(node.props?.children, c => collectItems(c, acc));
  }

  // Find label for current value
  let currentLabel = value;
  items.forEach(item => {
    if (item.props.value === value) {
      currentLabel = item.props.children;
    }
  });

  return (
    <MobileSelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      {/* Trigger — render the SelectTrigger child as-is but intercept click */}
      {React.Children.map(children, child => {
        if (React.isValidElement(child) && (child.type === SelectTrigger || child.props?.className?.includes('trigger'))) {
          return React.cloneElement(child, {
            onClick: (e) => { e.preventDefault(); setOpen(true); },
            // Override the Radix trigger with a plain button
            asChild: false,
          });
        }
        return null; // drawer handles the content; skip SelectContent etc.
      })}

      {/* Fallback trigger if no SelectTrigger found */}
      <DrawerPrimitive.Root open={open} onOpenChange={setOpen}>
        <DrawerPrimitive.Portal>
          <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <DrawerPrimitive.Content className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl border bg-background pb-safe">
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted mb-2" />
            <div className="overflow-y-auto max-h-[70vh] p-2">
              {items.map((item, idx) => {
                const isSelected = item.props.value === value;
                return (
                  <button
                    key={idx}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 text-sm rounded-lg transition-colors",
                      isSelected ? "bg-accent font-medium" : "hover:bg-accent/50"
                    )}
                    onClick={() => {
                      onValueChange?.(item.props.value);
                      setOpen(false);
                    }}
                  >
                    {item.props.children}
                    {isSelected && <Check className="h-4 w-4 ml-2 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Portal>
      </DrawerPrimitive.Root>
    </MobileSelectContext.Provider>
  );
}

// Marker component — used both on desktop (as SelectItem) and mobile (item collector)
const MobileSelectItem = React.forwardRef(({ value, children, className, ...props }, ref) => {
  const ctx = React.useContext(MobileSelectContext);
  if (ctx) {
    // Inside MobileSelect — items are rendered by the drawer, not here
    return null;
  }
  // Desktop fallback — render as normal SelectItem
  return (
    <SelectItem ref={ref} value={value} className={className} {...props}>
      {children}
    </SelectItem>
  );
});
MobileSelectItem.displayName = "MobileSelectItem";


// ─── Smart wrappers: auto-switch on mobile ─────────────────────────────────────
function SmartSelect({ value, onValueChange, children, ...props }) {
  const [mobile, setMobile] = React.useState(false);
  React.useEffect(() => {
    setMobile(isMobileDevice());
  }, []);

  if (mobile) {
    return (
      <MobileSelect value={value} onValueChange={onValueChange}>
        {children}
      </MobileSelect>
    );
  }
  return (
    <Select value={value} onValueChange={onValueChange} {...props}>
      {children}
    </Select>
  );
}


export {
  Select,
  SmartSelect,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  MobileSelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}