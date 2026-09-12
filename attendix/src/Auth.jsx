import { useState } from "react";
import { loginUser, signupUser } from "./api";

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const hasMinLength = password.length >= 6;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*]/.test(password);

  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setErrorMessage("");
    setLoading(true);

    if (mode === "signup" && name.trim().length < 2) {
      setErrorMessage("Please enter your full name.");
      setLoading(false);
      return;
    }

    if (!email.trim()) {
      setErrorMessage("Please enter your email.");
      setLoading(false);
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email.trim())) {
      setErrorMessage("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    if (mode === "signup" && !/[A-Z]/.test(password)) {
      setErrorMessage("Password must contain at least one uppercase letter.");
      setLoading(false);
      return;
    }

    if (mode === "signup" && !/[a-z]/.test(password)) {
      setErrorMessage("Password must contain at least one lowercase letter.");
      setLoading(false);
      return;
    }

    if (mode === "signup" && !/[0-9]/.test(password)) {
      setErrorMessage("Password must contain at least one number.");
      setLoading(false);
      return;
    }

    if (mode === "signup" && !/[!@#$%^&*]/.test(password)) {
      setErrorMessage("Password must contain at least one special character.");
      setLoading(false);
      return;
    }

    try {
      const data =
        mode === "login"
          ? await loginUser({ email, password })
          : await signupUser({ name, email, password });

      if (!data.token) {
        setErrorMessage(data.message || "Authentication failed.");
        return;
      }

      localStorage.setItem("attendix_token", data.token);
      localStorage.setItem("attendix_user", JSON.stringify(data.user));

      onLogin(data.user);
    } catch (error) {
      console.error("Authentication error:", error);
      setErrorMessage(error.message || "Unable to connect to Attendix server.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode((currentMode) => (currentMode === "login" ? "signup" : "login"));

    setErrorMessage("");
    setName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">A</div>

          <div>
            <h1>Attendix</h1>
            <p>Smart Attendance Management</p>
          </div>
        </div>

        <div className="auth-heading">
          <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>

          <p>
            {mode === "login"
              ? "Login to continue to your attendance dashboard."
              : "Start managing your attendance with Attendix."}
          </p>
        </div>

        {errorMessage && <div className="auth-error">{errorMessage}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "signup" && (
            <div className="auth-field">
              <label htmlFor="auth-name">Name</label>

              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setErrorMessage("");
                }}
                placeholder="Enter your name"
                required
              />
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="auth-email">Email</label>

            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setErrorMessage("");
              }}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="auth-password">Password</label>

            <div className="password-field">
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setErrorMessage("");
                }}
                placeholder="Enter your password"
                minLength={6}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            {mode === "signup" && password.length > 0 && (
              <div className="password-hint">
                <span className={hasMinLength ? "valid" : ""}>
                  {hasMinLength ? "✓" : "•"} 6+ characters
                </span>

                <span className={hasUppercase ? "valid" : ""}>
                  {hasUppercase ? "✓" : "•"} Uppercase
                </span>

                <span className={hasLowercase ? "valid" : ""}>
                  {hasLowercase ? "✓" : "•"} Lowercase
                </span>

                <span className={hasNumber ? "valid" : ""}>
                  {hasNumber ? "✓" : "•"} Number
                </span>

                <span className={hasSpecial ? "valid" : ""}>
                  {hasSpecial ? "✓" : "•"} Special character
                </span>
              </div>
            )}
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Login"
                : "Create Account"}
          </button>
        </form>

        <div className="auth-switch">
          <span>
            {mode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}
          </span>

          <button
            type="button"
            onClick={switchMode}
            className="auth-switch-button"
          >
            {mode === "login" ? "Sign Up" : "Login"}
          </button>
        </div>
      </div>
    </div>
  );
}
