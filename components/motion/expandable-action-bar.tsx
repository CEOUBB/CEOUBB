"use client";
// beui.dev/components/blocks/expandable-action-bar

import {
  type FocusEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDismiss } from "@/lib/hooks/use-dismiss";
import { useHoverGesture } from "@/lib/hooks/use-hover-gesture";
import { useTapGesture } from "@/lib/hooks/use-tap-gesture";

export type ExpandableActionBarSize = "sm" | "md";

export type ExpandableActionBarItem = {
  id: string;
  label: ReactNode;
  icon: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  badge?: ReactNode;
  shortcut?: ReactNode;
};

export type ExpandableActionBarClassNames = {
  root?: string;
  track?: string;
  item?: string;
  activeItem?: string;
  icon?: string;
  label?: string;
  badge?: string;
  shortcut?: string;
};

export interface ExpandableActionBarProps {
  items: ExpandableActionBarItem[];
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  activeId?: string;
  onAction?: (item: ExpandableActionBarItem) => void;
  size?: ExpandableActionBarSize;
  /**
   * Expand when a pointer that hovers rests on the bar. Default true.
   */
  expandOnHover?: boolean;
  expandOnFocus?: boolean;
  collapseDelay?: number;
  className?: string;
  classNames?: ExpandableActionBarClassNames;
  renderItem?: (
    item: ExpandableActionBarItem,
    state: { expanded: boolean; active: boolean }
  ) => ReactNode;
}

const SIZE_CLASS: Record<ExpandableActionBarSize, string> = {
  sm: "min-h-9 gap-1 p-1 text-xs",
  md: "min-h-11 gap-1.5 p-1.5 text-sm",
};

const ITEM_SIZE_CLASS: Record<ExpandableActionBarSize, string> = {
  sm: "h-7 min-w-7 px-1.5",
  md: "h-8 min-w-8 px-2.5",
};

const ICON_SIZE_CLASS: Record<ExpandableActionBarSize, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
};

function useControllableExpanded({
  expanded,
  defaultExpanded,
  onExpandedChange,
}: {
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded ?? false);
  const isControlled = expanded !== undefined;
  const value = expanded ?? internalExpanded;

  const setValue = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalExpanded(next);
      onExpandedChange?.(next);
    },
    [isControlled, onExpandedChange]
  );

  return [value, setValue] as const;
}

export function ExpandableActionBar({
  items,
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  activeId,
  onAction,
  size = "md",
  expandOnHover = true,
  expandOnFocus = true,
  collapseDelay = 90,
  className = "",
  classNames,
  renderItem,
}: ExpandableActionBarProps) {
  const [isExpanded, setIsExpanded] = useControllableExpanded({
    expanded,
    defaultExpanded,
    onExpandedChange,
  });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tapExpanded, setTapExpanded] = useState(false);
  const collapseTimer = useRef<number | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const tap = useTapGesture<boolean>();
  const hover = useHoverGesture();

  const clearCollapseTimer = useCallback(() => {
    if (collapseTimer.current) window.clearTimeout(collapseTimer.current);
    collapseTimer.current = null;
  }, []);

  const open = useCallback(() => {
    clearCollapseTimer();
    setIsExpanded(true);
  }, [clearCollapseTimer, setIsExpanded]);

  const close = useCallback(() => {
    clearCollapseTimer();
    setIsExpanded(false);
    setHoveredId(null);
    setTapExpanded(false);
  }, [clearCollapseTimer, setIsExpanded]);

  useEffect(() => clearCollapseTimer, [clearCollapseTimer]);

  const isDismissActive = tapExpanded && isExpanded;

  useDismiss(isDismissActive, close, trackRef, {
    behavior: "consume",
  });

  const onRootPointerEnter = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (hover.enter(event) && expandOnHover) open();
  };

  const onRootPointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!hover.leave(event)) return;
    setHoveredId(null);

    if (expandOnHover) {
      clearCollapseTimer();
      collapseTimer.current = window.setTimeout(close, collapseDelay);
    }
  };

  const onRootFocus = () => {
    if (expandOnFocus) open();
  };

  const onRootBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node) && expandOnFocus) {
      close();
    }
  };

  const activeItemId = activeId ?? items.find((item) => item.active)?.id;
  const highlightId = hoveredId ?? activeItemId;

  return (
    <div
      onPointerEnter={onRootPointerEnter}
      onPointerLeave={onRootPointerLeave}
      onFocus={onRootFocus}
      onBlur={onRootBlur}
      className={`inline-flex max-w-full ${classNames?.root ?? ""} ${className}`.trim()}
    >
      <div
        ref={trackRef}
        className={`relative inline-flex max-w-full items-center overflow-hidden rounded-full border border-[oklch(0.92_0.006_60)] bg-white/95 shadow-2xl backdrop-blur-xl [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
          SIZE_CLASS[size]
        } ${classNames?.track ?? ""}`.trim()}
      >
        {items.map((item) => {
          const isActive = item.active || activeId === item.id;
          const isHighlighted = highlightId === item.id;

          return (
            <button
              key={item.id}
              type="button"
              disabled={item.disabled}
              title={typeof item.label === "string" ? item.label : undefined}
              onPointerEnter={(event: ReactPointerEvent<HTMLButtonElement>) => {
                if (!hover.enter(event)) return;
                clearCollapseTimer();
                setHoveredId(item.id);
              }}
              onPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) => {
                tap.start(event, isExpanded);
              }}
              onPointerCancel={tap.drop}
              onKeyDown={tap.drop}
              onClick={(event: MouseEvent<HTMLButtonElement>) => {
                if (event.detail > 0) event.currentTarget.blur();
                const gesture = tap.take();
                const firstTap =
                  gesture !== null &&
                  gesture.pointerType !== "mouse" &&
                  !gesture.state &&
                  !tapExpanded;
                if (firstTap && expandOnHover) {
                  setTapExpanded(true);
                  open();
                  setHoveredId(item.id);
                  return;
                }
                item.onClick?.();
                onAction?.(item);
              }}
              className={`relative isolate inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium text-[oklch(0.36_0.03_255)] outline-none focus-visible:text-[oklch(0.2_0.03_260)] disabled:pointer-events-none disabled:opacity-40 ${
                isHighlighted ? "text-[oklch(0.48_0.18_255)]" : ""
              } ${ITEM_SIZE_CLASS[size]} ${classNames?.item ?? ""} ${
                isActive ? (classNames?.activeItem ?? "") : ""
              }`.trim()}
            >
              {isHighlighted ? (
                <span className="absolute inset-0 -z-10 rounded-full bg-[oklch(0.48_0.18_255/0.1)]" />
              ) : null}

              {renderItem ? (
                renderItem(item, { expanded: isExpanded, active: isActive })
              ) : (
                <>
                  <span
                    className={`inline-flex shrink-0 items-center justify-center ${
                      ICON_SIZE_CLASS[size]
                    } ${classNames?.icon ?? ""}`.trim()}
                  >
                    {item.icon}
                  </span>

                  <span
                    aria-hidden={!isExpanded}
                    style={{
                      width: isExpanded ? "auto" : 0,
                      opacity: isExpanded ? 1 : 0,
                      marginLeft: isExpanded ? 8 : 0,
                    }}
                    className={`inline-block overflow-hidden whitespace-nowrap ${
                      classNames?.label ?? ""
                    }`.trim()}
                  >
                    {item.label}
                  </span>

                  {item.shortcut ? (
                    <span
                      aria-hidden={!isExpanded}
                      style={{ opacity: isExpanded ? 1 : 0 }}
                      className={`hidden overflow-hidden whitespace-nowrap text-[10px] text-[oklch(0.52_0.03_250)] sm:inline-block font-mono ${
                        isExpanded ? "ml-1 max-w-[48px]" : "max-w-0"
                      } ${classNames?.shortcut ?? ""}`.trim()}
                    >
                      {item.shortcut}
                    </span>
                  ) : null}

                  {item.badge ? (
                    <span
                      className={`ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[oklch(0.48_0.18_255)] px-1.5 text-[10px] font-semibold leading-none text-white ${
                        !isExpanded ? "absolute right-0.5 top-0.5" : ""
                      } ${classNames?.badge ?? ""}`.trim()}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function useExpandableActionBar(items: ExpandableActionBarItem[]) {
  const [expanded, setExpanded] = useState(false);
  const [activeId, setActiveId] = useState(items[0]?.id);

  const activeItem = useMemo(() => items.find((item) => item.id === activeId), [activeId, items]);

  return useMemo(
    () => ({ expanded, setExpanded, activeId, setActiveId, activeItem }),
    [activeId, activeItem, expanded]
  );
}
