'use client';

import { useState } from 'react';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface MemberAvatarProps {
  name: string;
  photoUrl?: string | null;
  className?: string;
}

export function MemberAvatar({ name, photoUrl, className }: MemberAvatarProps) {
  const [errored, setErrored] = useState(false);
  const showImage = photoUrl && !errored;

  return (
    <div
      className={`flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-semibold text-muted-foreground ${className ?? ''}`}
      aria-hidden
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt={name}
          className="size-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <span>{initials(name)}</span>
      )}
    </div>
  );
}
