export function FeatureCard({ icon, title, description, status }: { icon: string; title: string; description: string; status: string }) {
  return <article className="feature-card"><span className="feature-icon" aria-hidden="true">{icon}</span><h2>{title}</h2><p>{description}</p><span className="status-badge">{status}</span></article>;
}
