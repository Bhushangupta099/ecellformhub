import { Link } from "@tanstack/react-router";

interface NietLogoProps {
  className?: string;
  showText?: boolean;
  textClassName?: string;
  logoHeightClass?: string;
  to?: string;
}

export function NietLogo({
  className = "flex items-center gap-3",
  showText = true,
  textClassName = "text-xl sm:text-2xl font-bold tracking-tight text-foreground",
  logoHeightClass = "h-12 sm:h-14",
  to,
}: NietLogoProps) {
  const content = (
    <div className={className}>
      <img
        src="/niet-logo.jpg"
        alt="NIET E-CELL Logo"
        className={`${logoHeightClass} w-auto object-contain transition-transform hover:scale-105 filter drop-shadow-sm`}
      />
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={textClassName}>
            NIET E-CELL <span className="text-primary">FormHub</span>
          </span>
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="inline-flex items-center">
        {content}
      </Link>
    );
  }

  return content;
}
