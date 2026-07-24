'use client';

import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTheme } from 'next-themes';
import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';
import { CheckCircleFillIcon, InfoIcon, LoaderIcon, WarningIcon } from './icons';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'loading' | 'info';

const iconsByType: Record<ToastType, ReactNode> = {
  success: <CheckCircleFillIcon />,
  error: <WarningIcon />,
  loading: <LoaderIcon size={16} />,
  info: <InfoIcon />,
};

function toastFunction(props: Omit<ToastProps, 'id'>, id?: string | number) {
  const render = (toastId: string | number) => (
    <Toast id={toastId} type={props.type} description={props.description} />
  );

  const options = { unstyled: true, ...(id !== undefined ? { id } : {}) };

  return sonnerToast.custom(render, options);
}

type PromiseMessages<T> = {
  loading: string;
  success: string | ((data: T) => string);
  error: string | ((error: unknown) => string);
};

function toastPromise<T>(
  promise: Promise<T> | (() => Promise<T>),
  messages: PromiseMessages<T>,
) {
  const id = toastFunction({ type: 'loading', description: messages.loading });
  const pending = typeof promise === 'function' ? promise() : promise;

  return pending
    .then((data) => {
      const description =
        typeof messages.success === 'function'
          ? messages.success(data)
          : messages.success;
      toastFunction({ type: 'success', description }, id);
      return data;
    })
    .catch((error) => {
      const description =
        typeof messages.error === 'function'
          ? messages.error(error)
          : messages.error;
      toastFunction({ type: 'error', description }, id);
      throw error;
    });
}

export const toast = Object.assign(toastFunction, {
  error: (description: string) => toastFunction({ type: 'error', description }),
  success: (description: string) =>
    toastFunction({ type: 'success', description }),
  info: (description: string) => toastFunction({ type: 'info', description }),
  promise: toastPromise,
});

export function Toaster() {
  const { resolvedTheme } = useTheme();

  return (
    <SonnerToaster
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      position="top-right"
      gap={8}
      offset={16}
      mobileOffset={{ top: 16, right: 16 }}
      visibleToasts={5}
      closeButton={false}
      expand={false}
      toastOptions={{
        classNames: {
          toast:
            'data-[styled=false]:!w-auto data-[styled=false]:!bg-transparent data-[styled=false]:!border-none data-[styled=false]:!shadow-none data-[styled=false]:!p-0',
          title: 'text-sm text-foreground font-normal',
          description: 'text-sm text-muted-foreground',
          actionButton:
            'bg-primary text-primary-foreground text-xs font-medium px-2.5 py-1 rounded-md',
        },
      }}
    />
  );
}

function Toast(props: ToastProps) {
  const { id, type, description } = props;

  const descriptionRef = useRef<HTMLDivElement>(null);
  const [multiLine, setMultiLine] = useState(false);

  useEffect(() => {
    const el = descriptionRef.current;
    if (!el) return;

    const update = () => {
      const lineHeight = Number.parseFloat(getComputedStyle(el).lineHeight);
      const lines = Math.round(el.scrollHeight / lineHeight);
      setMultiLine(lines > 1);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => ro.disconnect();
  }, [description]);

  return (
    <div
      data-testid="toast"
      key={id}
      className={cn(
        'pointer-events-auto flex w-[min(356px,calc(100vw-2rem))] flex-row gap-3 rounded-lg border border-border bg-card p-3 text-card-foreground shadow-md',
        multiLine ? 'items-start' : 'items-center',
      )}
    >
      <div
        data-type={type}
        className={cn(
          'shrink-0',
          'data-[type=error]:text-red-600 dark:data-[type=error]:text-red-400',
          'data-[type=success]:text-green-600 dark:data-[type=success]:text-green-400',
          'data-[type=loading]:text-muted-foreground',
          'data-[type=info]:text-blue-600 dark:data-[type=info]:text-blue-400',
          { 'pt-0.5': multiLine },
          type === 'loading' && 'animate-spin',
        )}
      >
        {iconsByType[type]}
      </div>
      <div ref={descriptionRef} className="text-sm leading-5 text-foreground">
        {description}
      </div>
    </div>
  );
}

interface ToastProps {
  id: string | number;
  type: ToastType;
  description: string;
}
