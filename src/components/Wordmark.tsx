interface WordmarkProps {
  size?: "sm" | "lg";
  showTagline?: boolean;
}

/**
 * The Akọ wordmark + tagline, matching the brand mockup:
 * serif display face, sage-green tagline beneath.
 */
export function Wordmark({ size = "lg", showTagline = true }: WordmarkProps) {
  return (
    <div className="text-center">
      <h1
        className={`font-display font-medium text-ink ${
          size === "lg" ? "text-6xl" : "text-3xl"
        }`}
      >
        Akọ
      </h1>
      {showTagline && (
        <p className="font-body text-accent text-sm mt-1 tracking-wide">
          A Reason to Reason
        </p>
      )}
    </div>
  );
}
