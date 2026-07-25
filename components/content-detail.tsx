import Link from "next/link";
import type { ContentItem } from "@/lib/content";

export function ContentDetail({ item, backHref, backLabel }: { item: ContentItem; backHref: string; backLabel: string }) {
  return (
    <main className="content-detail shell">
      <Link className="content-back" href={backHref}>← {backLabel}</Link>
      <article>
        <header>
          <div className="content-card-meta">
            {item.content_categories?.name_ar && <span>{item.content_categories.name_ar}</span>}
            <time dateTime={item.published_at}>{new Intl.DateTimeFormat("ar-YE", { dateStyle: "long" }).format(new Date(item.published_at))}</time>
          </div>
          <h1>{item.title_ar}</h1>
          {item.excerpt_ar && <p className="content-lead">{item.excerpt_ar}</p>}
        </header>
        <div className="content-body">
          {item.body_ar.split(/\n{2,}/).map((paragraph, index) => <p key={`${item.id}-${index}`}>{paragraph}</p>)}
        </div>
        {item.tags.length > 0 && <footer className="content-tags">{item.tags.map((tag) => <span key={tag}>#{tag}</span>)}</footer>}
      </article>
    </main>
  );
}
