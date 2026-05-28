import { useEffect, useState } from "react";
import VoiceAssistant from "./components/VoiceAssistant";
import { apiLogin, apiSignup, type AuthUser } from "./api/backendApi";

const SESSION_KEY = "voice_auth_session";

function App() {
  const [session, setSession] = useState<AuthUser | null>(null);
  const [isSignup, setIsSignup] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      setSession(JSON.parse(saved));
    }
  }, []);

  function saveSession(user: AuthUser) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    setSession(user);
  }

  async function handleSubmit() {
    try {
      setError("");

      const user = isSignup
        ? await apiSignup(name, email, password)
        : await apiLogin(email, password);

      saveSession(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  function handleLogout() {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }

  if (!session) {
    return (
      <main className="app-shell">
        <div className="app-card">
          <div className="hero-header">
            <div className="big-logo">🎙️</div>
            <h1>Urban Voice Task Manager</h1>
            <p>Your personal voice assistant for managing tasks ✨</p>
          </div>

          <div className="auth-box">
            <h2>{isSignup ? "Create account" : "Login"}</h2>

            {isSignup && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            )}

            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              type="email"
            />

            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type="password"
            />

            {error && <p className="error-text">{error}</p>}

            <button onClick={handleSubmit} className="voice-btn">
              {isSignup ? "Signup" : "Login"}
            </button>

            <button
              onClick={() => setIsSignup(!isSignup)}
              className="switch-auth-btn"
            >
              {isSignup
                ? "Already have an account? Login"
                : "No account? Signup"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <div className="app-card">
        <button className="logout-btn top-logout" onClick={handleLogout}>
          Logout
        </button>

        <div className="hero-header">
          <div className="big-logo">🎙️</div>
          <h1>Voice Controlled Task Manager</h1>
          <p>Your personal voice assistant for managing tasks ✨</p>
        </div>

        <VoiceAssistant username={session.name} userId={session.id} />
      </div>
    </main>
  );
}

export default App;