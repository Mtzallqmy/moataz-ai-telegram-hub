import { FeatureState } from "@/components/feature-state";
export default async function ConversationPage({params}:{params:Promise<{conversationId:string}>}){const {conversationId}=await params;return <FeatureState flag="AI_CHAT_ENABLED" title="المحادثة" description={`سيتم تحميل المحادثة ${conversationId} بعد التحقق من ملكيتها للمستخدم.`}/>;}
