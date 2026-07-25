import { ChatWorkspace } from "@/components/chat-workspace";
import { featureFlags } from "@/config/feature-flags";
import { FeatureState } from "@/components/feature-state";
export default function ChatPage(){if(!featureFlags.AI_CHAT_ENABLED)return <FeatureState flag="AI_CHAT_ENABLED" title="الدردشة" description="الدردشة غير مفعلة في هذه البيئة. فعّلها بعد تطبيق Migration وإضافة مزود ومفتاح مشفر ونموذج متاح."/>;return <ChatWorkspace/>;}
