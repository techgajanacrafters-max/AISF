import { AlertCircle, CheckCircle2, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

export function Loading({ label = "Loading your workspace" }: { label?: string }) {
  return (
    <div className="loading-screen">
      <LoaderCircle className="spin" size={28} />
      <span>{label}</span>
    </div>
  );
}

export function Notice({
  kind = "error",
  children,
}: {
  kind?: "error" | "success" | "info";
  children: ReactNode;
}) {
  const Icon = kind === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div className={`notice notice-${kind}`} role={kind === "error" ? "alert" : "status"}>
      <Icon size={18} />
      <span>{children}</span>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">✦</span>
      <strong>{title}</strong>
      {children && <span>{children}</span>}
    </div>
  );
}

export function Toast({
  title,
  kind = "success",
  children,
}: {
  title?: string;
  kind?: "error" | "success";
  children: ReactNode;
}) {
  const Icon = kind === "error" ? AlertCircle : CheckCircle2;
  return (
    <div className={`toast toast-${kind}`} role={kind === "error" ? "alert" : "status"}>
      <Icon size={18} />
      <span>{title && <strong>{title}</strong>}{children}</span>
    </div>
  );
}
