"use client";

import type { ExpressionType, GroupIconType } from "@/lib/moods";
import { getMoodExpression, getMoodGroup, MOOD_GROUPS } from "@/lib/moods";

// ── Face expressions ─────────────────────────────────────────────────────────
// All use viewBox="0 0 24 24", fill="none", stroke="currentColor".
// Dot eyes use fill="currentColor" stroke="none" so they stay solid.

function FaceExpression({ type }: { type: ExpressionType }) {
  switch (type) {
    case "joy":
      return (
        <>
          <path d="M7.5 10.5 Q9 9 10.5 10.5" />
          <path d="M13.5 10.5 Q15 9 16.5 10.5" />
          <path d="M7.5 14.5 Q12 19 16.5 14.5" />
        </>
      );
    case "pleasant":
      return (
        <>
          <circle cx="9" cy="10.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="10.5" r="1" fill="currentColor" stroke="none" />
          <path d="M8.5 14.5 Q12 17.5 15.5 14.5" />
        </>
      );
    case "gentle":
      return (
        <>
          <circle cx="9" cy="10.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="10.5" r="1" fill="currentColor" stroke="none" />
          <path d="M9.5 14.5 Q12 16 14.5 14.5" />
        </>
      );
    case "neutral":
      return (
        <>
          <circle cx="9" cy="10.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="10.5" r="1" fill="currentColor" stroke="none" />
          <path d="M9 14.5 L15 14.5" />
        </>
      );
    case "uncertain":
      return (
        <>
          <circle cx="9" cy="10.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="10.5" r="1" fill="currentColor" stroke="none" />
          <path d="M9 14.5 Q10.5 12.5 12 14.5 Q13.5 16.5 15 14.5" />
        </>
      );
    case "tired":
      return (
        <>
          <path d="M7.5 10 Q9 11.5 10.5 10" />
          <path d="M13.5 10 Q15 11.5 16.5 10" />
          <path d="M9.5 15.5 Q12 14.5 14.5 15.5" />
        </>
      );
    case "down":
      return (
        <>
          <circle cx="9" cy="10.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="10.5" r="1" fill="currentColor" stroke="none" />
          <path d="M9 15.5 Q12 13 15 15.5" />
        </>
      );
    case "distressed":
      return (
        <>
          <path d="M7.5 8.5 L10 10" />
          <path d="M16.5 8.5 L14 10" />
          <circle cx="9.5" cy="11.5" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="14.5" cy="11.5" r="1.2" fill="currentColor" stroke="none" />
          <path d="M8 16.5 Q12 12.5 16 16.5" />
        </>
      );
  }
}

// ── Group abstract icons ──────────────────────────────────────────────────────

function GroupIconPaths({ type }: { type: GroupIconType }) {
  switch (type) {
    case "sun":
      return (
        <>
          <circle cx="12" cy="12" r="4" />
          <line x1="12" y1="2"    x2="12" y2="5.5"  />
          <line x1="12" y1="18.5" x2="12" y2="22"   />
          <line x1="2"  y1="12"   x2="5.5"  y2="12" />
          <line x1="18.5" y1="12" x2="22"   y2="12" />
          <line x1="4.93"  y1="4.93"  x2="7.35"  y2="7.35"  />
          <line x1="16.65" y1="16.65" x2="19.07" y2="19.07" />
          <line x1="19.07" y1="4.93"  x2="16.65" y2="7.35"  />
          <line x1="7.35"  y1="16.65" x2="4.93"  y2="19.07" />
        </>
      );
    case "wave":
      return (
        <>
          <path d="M2 10 C5.5 6 8.5 14 12 10 S18.5 6 22 10" />
          <path d="M2 15 C5.5 11 8.5 19 12 15 S18.5 11 22 15" />
        </>
      );
    case "drop":
      return (
        <path d="M12 4 C12 4 5.5 12 5.5 16 a6.5 6.5 0 0 0 13 0 C18.5 12 12 4 12 4 Z" />
      );
    case "bolt":
      return (
        <path d="M13 2 L6 13.5 h5 L9.5 22 L19 11 h-5 Z" />
      );
    case "dashes":
      return (
        <>
          <path d="M6 9 h4 M14 9 h4" />
          <path d="M5 12.5 h14" />
          <path d="M6 16 h4 M14 16 h4" />
        </>
      );
  }
}

// ── Public components ─────────────────────────────────────────────────────────

interface MoodFaceIconProps {
  value: string;
  size?: number;
  className?: string;
}

export function MoodFaceIcon({ value, size = 20, className = "" }: MoodFaceIconProps) {
  const expression = getMoodExpression(value);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.5" />
      <FaceExpression type={expression} />
    </svg>
  );
}

interface MoodGroupIconProps {
  groupId: string;
  size?: number;
  className?: string;
}

export function MoodGroupIcon({ groupId, size = 24, className = "" }: MoodGroupIconProps) {
  const group = MOOD_GROUPS.find((g) => g.id === groupId);
  const iconType: GroupIconType = group?.iconType ?? "dashes";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <GroupIconPaths type={iconType} />
    </svg>
  );
}

// Convenience: renders a colored pill with face icon + label
interface MoodPillProps {
  value: string;
  className?: string;
}

export function MoodPill({ value, className = "" }: MoodPillProps) {
  const group = getMoodGroup(value);
  if (!group) return null;
  const label = group.emotions.find((e) => e.value === value)?.label ?? value;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${group.colorClass} ${group.textClass} ${className}`}
    >
      <MoodFaceIcon value={value} size={13} />
      {label}
    </span>
  );
}
