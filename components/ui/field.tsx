import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";

/** Props that link a control to its hint and error message for assistive tech. */
export const describe = (id: string, error?: string, hasHint = false) => ({
  id,
  name: id,
  "aria-invalid": error ? (true as const) : undefined,
  "aria-describedby": error ? `${id}-error` : hasHint ? `${id}-hint` : undefined,
});

interface FieldProps { id: string; label: string; required?: boolean; hint?: string; error?: string; children: ReactNode }

export function Field({ id, label, required, hint, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
        {required ? <span aria-hidden className="ms-1 text-red-600">*</span> : <span className="ms-1.5 text-xs font-normal text-slate-400">(اختیاری)</span>}
      </label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="text-xs leading-5 text-slate-500">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="flex items-start gap-1.5 text-xs leading-5 text-red-600">
          <AlertCircle aria-hidden className="mt-0.5 size-3.5 shrink-0" />{error}
        </p>
      )}
    </div>
  );
}
