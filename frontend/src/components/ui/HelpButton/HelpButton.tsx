import { useId, useLayoutEffect, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { tooltipPosition } from "../editorial-position";
interface HelpButtonProps {
  title: string;
  description: string;
  placement?: "left" | "right" | "center";
  className?: string;
}
export function HelpButton({
  title,
  description,
  placement = "left",
  className = "",
}: HelpButtonProps) {
  const id = useId(),
    trigger = useRef<HTMLButtonElement>(null),
    tip = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false),
    [host, setHost] = useState<HTMLElement | null>(null),
    [position, setPosition] = useState({ left: 12, top: 12 });
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      if (!trigger.current || !tip.current) return;
      setPosition(
        tooltipPosition(
          trigger.current.getBoundingClientRect(),
          tip.current.getBoundingClientRect(),
          window.innerWidth,
          window.innerHeight,
          placement,
        ),
      );
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, placement]);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (
        !trigger.current?.contains(event.target as Node) &&
        !tip.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  // Un diálogo modal hace inerte el body exterior; su propia capa mantiene visible la ayuda.

  return (
    <span className={`atlas-help ${className}`}>
      <button
        ref={trigger}
        type="button"
        aria-label={`Ayuda: ${title}`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={(event) => {
          setHost(event.currentTarget.closest("dialog") ?? document.body);
          setOpen((v) => !v);
        }}
        onMouseEnter={(event) => {
          setHost(event.currentTarget.closest("dialog") ?? document.body);
          setOpen(true);
        }}
        onMouseLeave={() => {
          if (document.activeElement !== trigger.current) setOpen(false);
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        className="atlas-help-trigger"
      >
        ?
      </button>
      {open &&
        createPortal(
          <div
            id={id}
            ref={tip}
            role="tooltip"
            className="atlas-help-tooltip"
            style={{ left: position.left, top: position.top }}
          >
            <strong>{title}</strong>
            <p>{description}</p>
          </div>,
          host ?? document.body,
        )}
    </span>
  );
}
export default HelpButton;
