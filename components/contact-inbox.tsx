"use client";

import { useEffect, useState } from "react";

type Message = { id: string; name: string; email: string; subject: string; message: string; status: "new" | "in_progress" | "resolved" | "spam" | "archived"; created_at: string; handled_at: string | null };
const labels: Record<Message["status"], string> = { new: "جديدة", in_progress: "قيد المتابعة", resolved: "تمت المعالجة", spam: "مزعجة", archived: "مؤرشفة" };

export function ContactInbox() {
  const [items, setItems] = useState<Message[]>([]);
  const [error, setError] = useState("");
  const [working, setWorking] = useState<string>();

  async function load() {
    const response = await fetch("/api/v1/admin/contact", { cache: "no-store" });
    const body = await response.json().catch(() => null);
    if (response.ok) setItems(body.data ?? []);
    else setError("تعذر تحميل الرسائل.");
  }
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, []);

  async function update(id: string, status: Message["status"]) {
    setWorking(id);
    setError("");
    const response = await fetch("/api/v1/admin/contact", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    if (!response.ok) setError("تعذر تحديث الرسالة.");
    await load();
    setWorking(undefined);
  }

  return <div className="stack">{error && <p className="error-state">{error}</p>}<div className="contact-inbox">
    {items.map((item) => <article className="inbox-card" key={item.id}><header><div><span className={`inbox-status ${item.status}`}>{labels[item.status]}</span><h2>{item.subject}</h2></div><time dateTime={item.created_at}>{new Intl.DateTimeFormat("ar-YE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at))}</time></header><div className="inbox-sender"><b>{item.name}</b><a href={`mailto:${item.email}`} dir="ltr">{item.email}</a></div><p>{item.message}</p><footer><button className="button" disabled={working === item.id} onClick={() => void update(item.id, "in_progress")}>قيد المتابعة</button><button className="button" disabled={working === item.id} onClick={() => void update(item.id, "resolved")}>تمت المعالجة</button><button className="button" disabled={working === item.id} onClick={() => void update(item.id, "archived")}>أرشفة</button><button className="button danger" disabled={working === item.id} onClick={() => void update(item.id, "spam")}>مزعجة</button></footer></article>)}
  </div>{items.length === 0 && <div className="empty-state">لا توجد رسائل تواصل بعد.</div>}</div>;
}
