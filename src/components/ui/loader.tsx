import { cn } from "@/lib/utils"
import "./loader.css"

interface LoaderProps {
  size?: "xs" | "sm" | "md" | "lg"
  overlay?: boolean
  className?: string
}

export const Loader = ({
  size = "md",
  overlay = false,
  className,
}: LoaderProps) => {
  const loaderContent = (
    <div className={cn("loaderWrap", `loader-${size}`, className)}>
      <div className="ring"></div>
      <div className="ring2"></div>
      <div className="center">
        <div className="logoText">FP</div>
      </div>
    </div>
  )

  if (overlay) {
    return <div className="overlay">{loaderContent}</div>
  }

  return loaderContent
}
