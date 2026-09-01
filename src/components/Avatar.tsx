interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-11 h-11 text-sm",
  // Sized against PostCard's tightened name/role/timestamp stack
  // (24px name line + 20px role line + 16px timestamp line = 60px),
  // so the avatar's top aligns with the name line and its bottom
  // lands close to the timestamp/globe row.
  xl: "w-16 h-16 text-xl",
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
