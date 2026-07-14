type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-24 w-24 text-2xl",
};

// Avatar reaproveitável: foto quando existe, iniciais como fallback.
export function Avatar({
  src,
  fallback,
  size = "md",
  className = "",
}: {
  src: string | null;
  fallback: string;
  size?: Size;
  className?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt="Foto de perfil"
        className={`${SIZES[size]} shrink-0 rounded-full border border-gray-200 object-cover ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`${SIZES[size]} flex shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-200 font-semibold text-gray-700 ${className}`}
    >
      {fallback}
    </span>
  );
}
