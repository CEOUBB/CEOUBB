type Size = number | string;

// Implements: REQ-SKELETON-01
export function Bone({
  w,
  h,
  r,
  quiet = false,
  round = false,
}: {
  w: Size;
  h: Size;
  r?: string;
  quiet?: boolean;
  round?: boolean;
}) {
  const className = ["sk", quiet && "sk-quiet", round && "sk-round"].filter(Boolean).join(" ");
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{ width: w, height: h, borderRadius: r }}
    />
  );
}

// Implements: REQ-SKELETON-01
export function Line({ w, quiet = false }: { w: Size; quiet?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={quiet ? "sk sk-line sk-quiet" : "sk sk-line"}
      style={{ width: w }}
    />
  );
}
