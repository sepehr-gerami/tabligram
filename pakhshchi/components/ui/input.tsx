"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 transition-colors hover:border-slate-300 focus-visible:border-brand-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 aria-invalid:border-red-500 aria-invalid:focus-visible:ring-red-100 disabled:bg-slate-50";

export const Input = ({
  className,
  ...props
}: ComponentProps<"input">) => (
  <input className={cn(base, "h-12", className)} {...props} />
);

export const Textarea = ({
  className,
  ...props
}: ComponentProps<"textarea">) => (
  <textarea
    className={cn(
      base,
      "min-h-28 resize-y py-3 leading-7",
      className
    )}
    {...props}
  />
);

interface CustomSelectProps {
  id?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  placeholder?: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  name?: string;
  required?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

interface SelectOption {
  value: string;
  label: string;
  disabled: boolean;
}

export function Select({
  id,
  value,
  defaultValue = "",
  onValueChange,
  onChange,
  onBlur,
  onFocus,
  placeholder = "انتخاب کنید",
  children,
  className,
  disabled = false,
  name,
  required,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: CustomSelectProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedValue = value ?? internalValue;

  const options: SelectOption[] = [];

  // گزینه‌های تعریف‌شده را از فرزندان استخراج می‌کنیم.
  const collectOptions = (nodes: ReactNode) => {
    const ReactChildren = require("react").Children;
    const ReactElement = require("react").isValidElement;

    ReactChildren.forEach(nodes, (child: ReactNode) => {
      if (!ReactElement(child)) return;

      const element = child as {
        type: unknown;
        props: {
          value?: string;
          children?: ReactNode;
          disabled?: boolean;
        };
      };

      if (element.type === "option") {
        options.push({
          value: element.props.value ?? "",
          label: String(element.props.children ?? ""),
          disabled: Boolean(element.props.disabled),
        });
      }
    });
  };

  collectOptions(children);

  const selectedOption = options.find(
    (option) => option.value === selectedValue
  );

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const selectOption = (option: SelectOption) => {
    if (option.disabled) return;

    if (value === undefined) {
      setInternalValue(option.value);
    }

    onValueChange?.(option.value);
    if (onChange) {
  const selectElement = document.createElement("select");
  const optionElement = document.createElement("option");

  optionElement.value = option.value;
  optionElement.textContent = option.label;

  selectElement.appendChild(optionElement);

  Object.defineProperty(selectElement, "value", {
    configurable: true,
    value: option.value,
  });

  onChange({
    target: selectElement,
    currentTarget: selectElement,
  } as React.ChangeEvent<HTMLSelectElement>);
}
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative w-full">
      {/* مقدار انتخاب‌شده و دکمه بازکردن فهرست */}
      <button
        type="button"
        disabled={disabled}
        id={id}
        onBlur={onBlur}
        onFocus={onFocus}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
        className={cn(
          base,
          "flex h-12 items-center justify-between gap-3 text-start",
          "disabled:cursor-not-allowed disabled:opacity-60",
          open && "border-brand-600 ring-4 ring-brand-100",
          className
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            !selectedOption && "text-slate-400"
          )}
        >
          {selectedOption?.label ?? placeholder}
        </span>

        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-4 shrink-0 text-slate-400 transition-transform duration-300",
            open && "rotate-180"
          )}
        />
      </button>

      {/* فهرست گزینه‌ها با انیمیشن باز و بسته‌شدن */}
      <div
        className={cn(
          "absolute inset-x-0 top-full z-50 mt-2 overflow-hidden",
          "rounded-xl border border-slate-200 bg-white",
          "shadow-[0_12px_35px_-12px_rgba(15,23,42,0.22)]",
          "origin-top transition-[opacity,transform,visibility] duration-300",
          open
            ? "visible translate-y-0 scale-100 opacity-100"
            : "invisible -translate-y-2 scale-[0.98] opacity-0"
        )}
      >
        <ul
          role="listbox"
          aria-label={placeholder}
          className="max-h-80 space-y-1 overflow-y-auto p-2"
        >
          {options.map((option) => {
            const isSelected = option.value === selectedValue;

            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={option.disabled}
                  onClick={() => selectOption(option)}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2",
                    "text-start text-sm font-medium transition-colors duration-200",
                    "disabled:cursor-not-allowed disabled:opacity-40",
                    isSelected
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                  )}
                >
                  <span className="min-w-0 flex-1">{option.label}</span>

                  {isSelected && (
                    <Check
                      aria-hidden="true"
                      className="size-4 shrink-0 text-brand-600"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* مقدار انتخاب‌شده برای ارسال فرم */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={selectedValue}
          required={required}
        />
      )}
    </div>
  );
}
