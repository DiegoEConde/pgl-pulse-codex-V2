"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { LockKeyhole, LogIn, UserRound } from "lucide-react";
import Logo from "@/components/core/Logo/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { DEMO_USER_PASSWORD, roleDisplayName } from "@/lib/demo-users";
import styles from "./AuthGate.module.css";

export default function AuthGate({ children }: { children: ReactNode }) {
  const { user, users, login } = useAuth();
  const [username, setUsername] = useState(users[0]?.username ?? "");
  const [password, setPassword] = useState(DEMO_USER_PASSWORD);
  const [error, setError] = useState("");

  if (user) return <>{children}</>;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = login(username, password);
    setError(result.ok ? "" : result.message ?? "No se pudo iniciar sesion.");
  }

  return (
    <main className={styles.shell}>
      <section className={styles.loginPanel} aria-label="Inicio de sesion PGL Pulse">
        <div className={styles.brand}>
          <Logo />
          <p>Acceso de prueba para validar permisos, pestañas y flujos locales.</p>
        </div>

        <form className={styles.form} onSubmit={submit}>
          <header>
            <span>Usuarios de prueba</span>
            <h1>Ingresar a PGL Pulse</h1>
          </header>

          <label>
            <span>Usuario</span>
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" autoFocus />
          </label>

          <label>
            <span>Contraseña</span>
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
          </label>

          {error && <p className={styles.error} role="alert">{error}</p>}

          <button className="primary-btn" type="submit">
            <LogIn size={16} />
            Entrar
          </button>
        </form>
      </section>

      <aside className={styles.userList} aria-label="Cuentas disponibles">
        {users.map((current) => (
          <button
            key={current.id}
            className={styles.userCard}
            type="button"
            onClick={() => {
              setUsername(current.username);
              setPassword(DEMO_USER_PASSWORD);
              setError("");
            }}
          >
            <i><UserRound size={18} /></i>
            <span>
              <strong>{current.nombre}</strong>
              <small>{roleDisplayName(current.rol)} / clave {DEMO_USER_PASSWORD}</small>
            </span>
          </button>
        ))}
        <div className={styles.note}>
          <LockKeyhole size={16} />
          <span>Login mock local. Las contraseñas no se guardan en la base v2.</span>
        </div>
      </aside>
    </main>
  );
}
