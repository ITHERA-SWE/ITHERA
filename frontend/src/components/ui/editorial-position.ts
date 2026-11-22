export function tooltipPosition(
  anchor: {
    left: number;
    right: number;
    top: number;
    bottom: number;
    width: number;
  },
  box: { width: number; height: number },
  vw: number,
  vh: number,
  placement: "left" | "right" | "center" = "left",
) {
  const gap = 10,
    margin = 12,
    width = Math.min(box.width, Math.max(0, vw - 2 * margin)),
    height = Math.min(box.height, Math.max(0, vh - 2 * margin));
  const ideal =
    placement === "right"
      ? anchor.right - width
      : placement === "center"
        ? anchor.left + (anchor.width - width) / 2
        : anchor.left;
  const left = Math.max(margin, Math.min(ideal, vw - width - margin));
  const below = anchor.bottom + gap;
  const top =
    below + height <= vh - margin
      ? below
      : Math.max(
          margin,
          Math.min(anchor.top - gap - height, vh - height - margin),
        );
  return { left, top };
}
