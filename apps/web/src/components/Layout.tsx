import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getNavItemsForRole, ROLE_LABELS } from "../auth/permissions";
import { Button } from "./Button";
import styles from "./Layout.module.css";

interface LayoutProps {
  title: string;
  children: ReactNode;
}

export function Layout({ title, children }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = user ? getNavItemsForRole(user.role) : [];
  const activeNavPath = [...navItems]
    .sort((a, b) => b.path.length - a.path.length)
    .find(
      (item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`),
    )?.path;
  const userInitials = user?.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    if (!sidebarOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [sidebarOpen]);

  const handleLogout = async () => {
    await logout();
    void navigate("/login");
  };

  return (
    <div className={styles.layout}>
      {sidebarOpen ? (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        id="main-navigation"
        className={[styles.sidebar, sidebarOpen ? styles.sidebarOpen : ""]
          .filter(Boolean)
          .join(" ")}
        aria-label="Main navigation"
      >
        <div className={styles.brand}>
          <div className={styles.brandMark} aria-hidden="true">
            OF
          </div>
          <div>
            <div className={styles.brandTitle}>OrderFlow</div>
            <div className={styles.brandSubtitle}>Operations control</div>
          </div>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navLabel}>Workspace</div>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              aria-current={activeNavPath === item.path ? "page" : undefined}
              className={[styles.navLink, activeNavPath === item.path ? styles.navLinkActive : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setSidebarOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {user ? (
          <div className={styles.userSection}>
            <div className={styles.userIdentity}>
              <div className={styles.avatar} aria-hidden="true">
                {userInitials}
              </div>
              <div>
                <div className={styles.userName}>{user.name}</div>
                <div className={styles.userRole}>{ROLE_LABELS[user.role]}</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className={styles.logoutBtn}
              onClick={() => void handleLogout()}
            >
              Log out
            </Button>
          </div>
        ) : null}
      </aside>

      <div className={styles.main}>
        <header className={styles.header}>
          <button
            type="button"
            className={styles.menuToggle}
            aria-label="Open menu"
            aria-expanded={sidebarOpen}
            aria-controls="main-navigation"
            onClick={() => setSidebarOpen((open) => !open)}
          >
            <span aria-hidden="true">☰</span>
          </button>
          <div>
            <div className={styles.headerEyebrow}>Operations workspace</div>
            <h1 className={styles.pageTitle}>{title}</h1>
          </div>
          {user ? (
            <div className={styles.headerStatus}>
              <span className={styles.statusDot} aria-hidden="true" />
              Live data
            </div>
          ) : null}
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
