import { type FormEvent, type ReactNode } from "react";
import { type MutationState } from "./types";
import {
  ApiRequestError,
  NavLink,
  PUBLIC_SITE_URL,
  buildBasicAuthorization,
  clsx,
  createPortal,
  fetchJson,
  useLocation,
  useState,
  writeStoredAdminAuthorization,
} from "./runtime";

export function AdminShell({
  children,
  showLogout,
  onLogout,
}: {
  children: ReactNode;
  showLogout: boolean;
  onLogout: () => void;
}) {
  const location = useLocation();
  const items = [
    ["/relays", "Relay"],
    ["/relays/history", "Relay历史"],
    ["/intake", "提交记录"],
    ["/intake/history", "提交历史"],
    ["/sponsors", "赞助位"],
    ["/models", "模型"],
  ] as const;

  function isItemActive(path: string) {
    return location.pathname === path;
  }

  return (
    <div className="admin-shell min-h-screen bg-[var(--bg)] text-white">
      <header className="admin-header">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="admin-header-bar">
            <div className="space-y-1.5">
              <div className="admin-brand">
                <div className="admin-brand-mark">
                  <span className="bg-[#ffd900]" />
                  <span className="bg-[#ffa110]" />
                  <span className="bg-[#fb6424]" />
                  <span className="bg-[#fa520f]" />
                </div>
                relaynew.ai 管理台
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg leading-tight tracking-[-0.05em] md:text-[1.45rem]">运营后台</h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="admin-nav">
                {items.map(([to, label]) => (
                  <NavLink key={to} to={to} end={false} className={clsx("pill", isItemActive(to) ? "pill-active" : "pill-idle")}>
                    {label}
                  </NavLink>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <a className="pill pill-ghost" href={PUBLIC_SITE_URL} target="_blank" rel="noreferrer">
                  前台站点
                </a>
                {showLogout ? (
                  <button className="pill pill-idle" type="button" onClick={onLogout}>
                    退出登录
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className="admin-main mx-auto max-w-7xl px-5 lg:px-10">{children}</main>
    </div>
  );
}

export function Card({ title, children }: { title: string; kicker?: string; children: ReactNode }) {
  return (
    <section className="card">
      <h2 className="text-[1.85rem] tracking-[-0.04em] md:text-[1.9rem]">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function Notice({ state }: { state: MutationState }) {
  if (state.error) {
    return <p className="text-sm text-[#ffb59c]">{state.error}</p>;
  }
  if (state.success) {
    return <p className="text-sm text-[#ffd06a]">{state.success}</p>;
  }
  return null;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  confirmPendingLabel,
  pending,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmPendingLabel: string;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal((
    <div
      aria-hidden={pending ? "true" : undefined}
      className="confirm-backdrop"
      onClick={pending ? undefined : onCancel}
      role="presentation"
    >
      <section
        aria-modal="true"
        className="confirm-dialog"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <p className="eyebrow">请确认操作</p>
        <h3 className="text-2xl tracking-[-0.04em]">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-white/64">{message}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2.5">
          <button className="pill pill-idle" disabled={pending} onClick={onCancel} type="button">
            取消
          </button>
          <button className="pill pill-active" disabled={pending} onClick={onConfirm} type="button">
            {pending ? confirmPendingLabel : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  ), document.body);
}

export function LoadingCard() {
  return <div className="card text-sm uppercase tracking-[0.16em] text-white/55">加载中...</div>;
}

export function ErrorCard({ message }: { message: string }) {
  return <div className="card border border-[#fa520f]/30 text-sm text-[#ffd0bd]">{message}</div>;
}

export function FieldError({ message }: { message: string | undefined }) {
  if (!message) {
    return null;
  }

  return <span className="mt-2 block text-xs normal-case tracking-normal text-[#ffb59c]">{message}</span>;
}

export function AdminLogin({ onAuthenticated }: { onAuthenticated: (authorization: string | null) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const authorization = buildBasicAuthorization(username.trim(), password);
      await fetchJson("/admin/overview", undefined, {
        authHeader: authorization,
        skipStoredAuth: true,
        suppressUnauthorizedEvent: true,
      });
      writeStoredAdminAuthorization(authorization);
      onAuthenticated(authorization);
    } catch (reason) {
      if (reason instanceof ApiRequestError && reason.statusCode === 401) {
        setError("管理员账号或密码不正确。");
      } else {
        setError(reason instanceof Error ? reason.message : "登录失败，请稍后重试。");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="admin-shell min-h-screen bg-[var(--bg)] text-white">
      <main className="admin-main mx-auto flex min-h-screen max-w-7xl items-center justify-center px-5 lg:px-10">
        <section className="card w-full max-w-md">
          <p className="eyebrow">管理员认证</p>
          <h1 className="text-3xl tracking-[-0.04em] md:text-[2rem]">登录后继续</h1>
          <p className="mt-3 text-sm leading-6 text-white/62">
            管理后台需要先完成身份验证，才能访问提交记录、Relay 列表、模型和赞助位管理。
          </p>
          <form className="mt-5 grid gap-3" onSubmit={handleSubmit}>
            <label className="field-label">
              用户名
              <input
                autoComplete="username"
                className="field-input"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="admin"
                required
                type="text"
              />
            </label>
            <label className="field-label">
              密码
              <input
                autoComplete="current-password"
                className="field-input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
                type="password"
              />
            </label>
            {error ? <p className="text-sm text-[#ffb59c]">{error}</p> : null}
            <button className="pill pill-active justify-center" disabled={pending} type="submit">
              {pending ? "验证中..." : "登录"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

export async function verifyAdminAccess(authorization: string | null) {
  await fetchJson("/admin/overview", undefined, {
    authHeader: authorization,
    skipStoredAuth: true,
    suppressUnauthorizedEvent: true,
  });
}
