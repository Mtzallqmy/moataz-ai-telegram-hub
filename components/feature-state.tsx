import { featureFlags, type FeatureFlag } from "@/config/feature-flags";

export function FeatureState({ flag, title, description }: { flag?: FeatureFlag; title: string; description: string }) {
  const enabled = flag ? featureFlags[flag] : false;
  return <div className="page-shell"><section className="state-card"><span className="state-icon">{enabled ? "✓" : "◇"}</span><h1>{title}</h1><p>{description}</p><span className="status-badge">{enabled ? "متاحة" : "غير مفعّلة في هذه المرحلة"}</span></section></div>;
}
