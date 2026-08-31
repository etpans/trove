export type AuthMode = "login" | "signup";

export type AuthFormState = {
  name: string;
  email: string;
  password: string;
  rememberMe: boolean;
};

export const emptyAuthForm: AuthFormState = {
  name: "",
  email: "",
  password: "",
  rememberMe: false,
};
