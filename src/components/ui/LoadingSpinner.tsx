import { Loader2 } from "lucide-react";

interface Props {
  className?: string;
  size?: number;
}

export function LoadingSpinner({ className = "", size = 24 }: Props) {
  return <Loader2 className={`animate-spin text-blue-600 ${className}`} size={size} />;
}
