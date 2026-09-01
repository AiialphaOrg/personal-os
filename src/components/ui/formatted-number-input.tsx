import * as React from "react"
import { Input } from "@/components/ui/input"

export function formatNumberWithCommas(val: string | number): string {
  if (val === null || val === undefined || val === "") return ""
  const str = String(val).replace(/[^0-9.]/g, "")
  const parts = str.split(".")
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return parts.join(".")
}

export function parseRawNumber(val: string): string {
  return val.replace(/,/g, "")
}

interface FormattedNumberInputProps extends Omit<React.ComponentProps<typeof Input>, "onChange" | "value"> {
  value: string
  onValueChange: (rawDigits: string) => void
  prefix?: string
}

export const FormattedNumberInput = React.forwardRef<HTMLInputElement, FormattedNumberInputProps>(
  ({ value, onValueChange, prefix, className, ...props }, ref) => {
    const formatted = formatNumberWithCommas(value)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = parseRawNumber(e.target.value)
      onValueChange(raw)
    }

    return (
      <div className="relative flex items-center w-full">
        {prefix && (
          <span className="absolute left-3 text-sm font-semibold text-muted-foreground select-none">
            {prefix}
          </span>
        )}
        <Input
          {...props}
          ref={ref}
          type="text"
          inputMode="decimal"
          value={formatted}
          onChange={handleChange}
          className={`${prefix ? "pl-8" : ""} ${className || ""}`}
        />
      </div>
    )
  }
)

FormattedNumberInput.displayName = "FormattedNumberInput"
