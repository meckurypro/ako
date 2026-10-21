interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "vn" | "lg" | "xl" | "2xl";
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  // Matches the Uche reference: avatar reads as a compact identity marker,
  // not a headline element — roughly in line with the name+role stack.
  md: "w-10 h-10 text-sm",
  vn: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-xl",
  lg: "w-20 h-20 text-2xl",
  "2xl": "w-28 h-28 text-4xl",
};

export function Avatar({ src, name, size = "md" }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeClasses[size]} rounded-full object-cover flex-shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-accent-soft text-accent font-medium
        flex items-center justify-center flex-shrink-0`}
    >
      {initials}
    </div>
  );
}
