import TextField from "@mui/material/TextField";

type FormTextFieldProps = {
  label: string;
  name: string;
  value: string;
  focusedField: string | null;
  setFocusedField: (field: string | null) => void;
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
  focusedField,
  setFocusedField,
  onChange,
  required = false,
  placeholder,
  type = "text",
  error = false,
  helperText,
}: FormTextFieldProps) {
  const fieldLabelClassName =
    "mb-1.5 block text-left text-[12px] font-medium tracking-[0.01em] text-[#6b6b6b]";

  return (
    <label className="block text-left">
      <span className={fieldLabelClassName}>
        {label} {required && "*"}
      </span>

      <TextField
        error={error}
        fullWidth
        helperText={helperText}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocusedField(name)}
        onBlur={() => setFocusedField(null)}
        placeholder={
          focusedField === name
            ? (placeholder ?? `Your ${label.toLowerCase()}`)
            : ""
        }
        size="small"
        variant="outlined"
        sx={{
          "& .MuiFormHelperText-root": {
            ml: 0,
            mt: 1,
            fontSize: "12px",
          },
          "& .MuiOutlinedInput-input": {
            color: "#111111",
            padding: "0 14px",
            height: "48px",
            boxSizing: "border-box",
          },
          "& .MuiOutlinedInput-root": {
            minHeight: "48px",
            borderRadius: "10px",
            backgroundColor: "#ffffff",

            "& fieldset": {
              borderColor: "#d7dce5",
            },

            "&:hover fieldset": {
              borderColor: "#c5ccd8",
            },

            "&.Mui-focused fieldset": {
              borderColor: "#378ADD",
            },
          },
        }}
      />
    </label>
  );
}
