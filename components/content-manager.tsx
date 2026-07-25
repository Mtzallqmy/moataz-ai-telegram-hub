"use client";

import { useEffect, useState } from "react";

type Category = { id: string; slug: string; name_ar: string; is_active: boolean };
type Item = { id: string; kind: "article" | "post" | "book_summary"; slug: string; title_ar: string; excerpt_ar: string | null; body_ar: string; status: "draft" | "review" | "published" | "archived"; featured: boolean; tags: string[]; updated_at: string; content_categories: Category | null };

const statusLabels: Record<Item["status"], string> = { draft: "مسودة", review: "للمراجعة", published: "منشور", archived: "مؤرشف" };
const kindLabels: Record<Item["kind"], string> = { article: "مقال", post: "منشور", book_summary: "ملخص كتاب" };

export function ContentManager() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState<string>();

  async function load() {
    const response = await fetch("/api/v1/admin/content", { cache: "no-store" });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.error?.message ?? "تعذر تحميل المحتوى.");
      return;
    }
    setItems(body.data?.items ?? []);
    setCategories(body.data?.categories ?? []);
  }

  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, []);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = event.currentTarget;
    const values = new FormData(form);
    const response = await fetch("/api/v1/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: String(values.get("kind")),
        slug: String(values.get("slug")),
        titleAr: String(values.get("titleAr")),
        excerptAr: String(values.get("excerptAr") || ""),
        bodyAr: String(values.get("bodyAr")),
        categoryId: String(values.get("categoryId") || "") || null,
        status: String(values.get("status")),
        featured: values.get("featured") === "on",
        tags: String(values.get("tags") || "").split(/[،,]/).map((tag) => tag.trim()).filter(Boolean),
      }),
    });
    const body = await response.json().catch(() => null);
    if (response.ok) {
      form.reset();
      await load();
    } else setError(body?.error?.message ?? "تعذر حفظ المحتوى.");
    setSaving(false);
  }

  async function changeStatus(item: Item, status: Item["status"]) {
    setWorkingId(item.id);
    setError("");
    const response = await fetch(`/api/v1/admin/content/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, changeSummary: `تغيير الحالة من ${item.status} إلى ${status}` }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) setError(body?.error?.message ?? "تعذر تغيير حالة المحتوى.");
    await load();
    setWorkingId(undefined);
  }

  async function remove(item: Item) {
    if (!window.confirm(`حذف «${item.title_ar}» نهائيًا؟`)) return;
    setWorkingId(item.id);
    const response = await fetch(`/api/v1/admin/content/${item.id}`, { method: "DELETE" });
    if (!response.ok) setError("تعذر حذف المحتوى.");
    await load();
    setWorkingId(undefined);
  }

  return (
    <div className="stack">
      <form className="content-editor-form" onSubmit={(event) => void create(event)}>
        <header><div><span className="panel-kicker">EDITORIAL WORKFLOW</span><h2>إنشاء محتوى</h2></div><p>ابدأ بمسودة، راجعها، ثم انشرها عند الجاهزية.</p></header>
        <div className="editor-grid">
          <label><span>النوع</span><select name="kind" defaultValue="article"><option value="article">مقال</option><option value="post">منشور</option><option value="book_summary">ملخص كتاب</option></select></label>
          <label><span>التصنيف</span><select name="categoryId" defaultValue=""><option value="">بدون تصنيف</option>{categories.filter((category) => category.is_active).map((category) => <option value={category.id} key={category.id}>{category.name_ar}</option>)}</select></label>
          <label><span>الحالة</span><select name="status" defaultValue="draft"><option value="draft">مسودة</option><option value="review">للمراجعة</option><option value="published">نشر مباشر</option></select></label>
          <label className="editor-wide"><span>العنوان</span><input name="titleAr" required minLength={3} maxLength={220} /></label>
          <label className="editor-wide"><span>المعرّف في الرابط</span><input name="slug" required pattern="[a-z0-9][a-z0-9-]{1,140}" placeholder="my-article-slug" dir="ltr" /></label>
          <label className="editor-wide"><span>الوصف المختصر</span><textarea name="excerptAr" maxLength={600} rows={3} /></label>
          <label className="editor-wide"><span>المحتوى</span><textarea name="bodyAr" required minLength={20} rows={12} /></label>
          <label className="editor-wide"><span>الوسوم، مفصولة بفواصل</span><input name="tags" placeholder="ذكاء اصطناعي، برمجة، أتمتة" /></label>
          <label className="editor-check"><input type="checkbox" name="featured" /><span>إبراز في الصفحة الرئيسية</span></label>
        </div>
        <button className="button primary" type="submit" disabled={saving}>{saving ? "جارٍ الحفظ…" : "حفظ المحتوى"}</button>
      </form>

      {error && <p className="error-state" aria-live="polite">{error}</p>}
      <div className="table-wrap"><table><thead><tr><th>العنوان</th><th>النوع</th><th>الحالة</th><th>آخر تحديث</th><th>الإجراءات</th></tr></thead><tbody>
        {items.map((item) => <tr key={item.id}><td>{item.title_ar}<small>/{item.slug} · {item.content_categories?.name_ar ?? "بدون تصنيف"}</small></td><td>{kindLabels[item.kind]}</td><td>{statusLabels[item.status]}{item.featured ? " · مميز" : ""}</td><td>{new Intl.DateTimeFormat("ar-YE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.updated_at))}</td><td>
          {item.status !== "published" && <button className="button" disabled={workingId === item.id} onClick={() => void changeStatus(item, "published")}>نشر</button>}
          {item.status === "published" && <button className="button" disabled={workingId === item.id} onClick={() => void changeStatus(item, "archived")}>أرشفة</button>}
          {item.status === "archived" && <button className="button" disabled={workingId === item.id} onClick={() => void changeStatus(item, "draft")}>إعادة لمسودة</button>}
          <button className="button danger" disabled={workingId === item.id} onClick={() => void remove(item)}>حذف</button>
        </td></tr>)}
      </tbody></table></div>
      {items.length === 0 && <div className="empty-state">لا يوجد محتوى بعد.</div>}
    </div>
  );
}
