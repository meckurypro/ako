interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-11 h-11 text-sm",
  // Matches the height of a post header's name + role tags + timestamp
  // stack (24px name line + 16px roles line + 16px timestamp line = 56px),
  // so the avatar's top aligns with the name's line and its bottom aligns
  // with the timestamp/globe row.
  xl: "w-14 h-14 text-lg",
  lg: "w-20 h-20 text-2xl",
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
