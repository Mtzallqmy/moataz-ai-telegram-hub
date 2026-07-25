"use client";

import { useState } from "react";

export function ContactForm() {
  const [state, setState] = useState<{ type: "idle" | "saving" | "success" | "error"; message?: string }>({ type: "idle" });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setState({ type: "saving" });
    const response = await fetch("/api/v1/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(data.get("name") ?? ""),
        email: String(data.get("email") ?? ""),
        subject: String(data.get("subject") ?? ""),
        message: String(data.get("message") ?? ""),
        website: String(data.get("website") ?? ""),
      }),
    }).catch(() => null);

    if (!response) {
      setState({ type: "error", message: "تعذر الاتصال بالخادم. حاول مرة أخرى." });
      return;
    }
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setState({ type: "error", message: body?.error?.message ?? "تعذر إرسال الرسالة." });
      return;
    }
    form.reset();
    setState({ type: "success", message: "تم استلام رسالتك بنجاح." });
  }

  return (
    <form className="contact-form" onSubmit={(event) => void submit(event)}>
      <div className="contact-row">
        <label><span>الاسم</span><input name="name" required minLength={2} maxLength={120} autoComplete="name" /></label>
        <label><span>البريد الإلكتروني</span><input name="email" type="email" required maxLength={320} autoComplete="email" dir="ltr" /></label>
      </div>
      <label><span>الموضوع</span><input name="subject" required minLength={3} maxLength={180} /></label>
      <label><span>الرسالة</span><textarea name="message" required minLength={10} maxLength={5000} rows={8} /></label>
      <label className="contact-trap" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <button className="button primary" type="submit" disabled={state.type === "saving"}>{state.type === "saving" ? "جارٍ الإرسال…" : "إرسال الرسالة"}</button>
      {state.message && <p className={state.type === "success" ? "form-success" : "error-state"} aria-live="polite">{state.message}</p>}
    </form>
  );
}
