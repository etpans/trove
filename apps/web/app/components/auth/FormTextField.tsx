type FormTextFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  type?: React.HTMLInputTypeAttribute;
  error?: boolean;
  helperText?: React.ReactNode;
};

export default function FormTextField({
  label,
  name,
  value,
  onChange,
  required = false,
  placeholder,
  type = "text",
  error = false,
  helperText,
}: FormTextFieldProps) {
  const fieldLabelClassName =
    "mb-1.5 block text-left text-[12px] font-medium tracking-[0.01em] text-[#6b6b6b]";
  const helperTextId = helperText ? `${name}-helper-text` : undefined;

  return (
    <label className="block text-left">
      <span className={fieldLabelClassName}>
        {label} {required && "*"}
      </span>

      <input
        aria-describedby={helperTextId}
        aria-invalid={error || undefined}
        className={[
          "h-12 w-full rounded-[10px] border bg-white px-[14px] text-sm text-[#111111] outline-none transition",
          "placeholder:opacity-0 placeholder:transition-opacity placeholder:duration-150 focus:placeholder:opacity-100",
          error
            ? "border-[#b42318] focus:border-[#b42318]"
            : "border-[#d7dce5] hover:border-[#c5ccd8] focus:border-[#378ADD]",
        ].join(" ")}
        name={name}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? `Your ${label.toLowerCase()}`}
        required={required}
        type={type}
        value={value}
      />

      {helperText ? (
        <p
          className={[
            "mt-1 text-left text-[12px]",
            error ? "text-[#b42318]" : "text-transparent",
          ].join(" ")}
          id={helperTextId}
        >
          {helperText}
        </p>
      ) : null}
    </label>
  );
}
