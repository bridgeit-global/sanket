'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccordionItemProps {
  value: string;
  children: React.ReactNode;
}

interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  isOpen?: boolean;
}

interface AccordionContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  isOpen?: boolean;
}

const AccordionContext = React.createContext<{
  openItems: Set<string>;
  toggleItem: (value: string) => void;
}>({
  openItems: new Set(),
  toggleItem: () => {},
});

export function Accordion({
  children,
  defaultValue,
  type = 'single',
}: {
  children: React.ReactNode;
  defaultValue?: string | string[];
  type?: 'single' | 'multiple';
}) {
  const [openItems, setOpenItems] = React.useState<Set<string>>(
    () => new Set(Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : [])
  );

  const toggleItem = React.useCallback((value: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        if (type === 'single') {
          next.clear();
        }
        next.add(value);
      }
      return next;
    });
  }, [type]);

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem }}>
      <div className="space-y-2">{children}</div>
    </AccordionContext.Provider>
  );
}

export function AccordionItem({ value, children }: AccordionItemProps) {
  const { openItems, toggleItem } = React.useContext(AccordionContext);
  const isOpen = openItems.has(value);

  return (
    <div className="border rounded-lg overflow-hidden">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { ...child.props, isOpen, value, toggleItem } as any);
        }
        return child;
      })}
    </div>
  );
}

export function AccordionTrigger({
  children,
  className,
  isOpen,
  value,
  toggleItem,
  ...props
}: AccordionTriggerProps & { value?: string; toggleItem?: (value: string) => void }) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center justify-between p-4 text-left font-medium transition-all hover:bg-muted/50 [&[data-state=open]>svg]:rotate-180',
        className
      )}
      onClick={() => value && toggleItem?.(value)}
      data-state={isOpen ? 'open' : 'closed'}
      {...props}
    >
      {children}
      <ChevronDown
        className={cn(
          'h-4 w-4 shrink-0 transition-transform duration-200',
          isOpen && 'rotate-180'
        )}
      />
    </button>
  );
}

export function AccordionContent({
  children,
  className,
  isOpen,
  ...props
}: AccordionContentProps) {
  return (
    <div
      className={cn(
        'overflow-hidden transition-all',
        isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0',
        className
      )}
      {...props}
    >
      <div className="p-4 pt-0">{children}</div>
    </div>
  );
}

