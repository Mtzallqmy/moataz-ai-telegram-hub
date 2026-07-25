import { ContactInbox } from "@/components/contact-inbox";

export default function ContactInboxPage() {
  return (
    <section className="page-section">
      <h1>رسائل التواصل</h1>
      <p>مراجعة الرسائل الواردة وتحديث حالة معالجتها دون إظهار بيانات تتبع حساسة.</p>
      <ContactInbox />
    </section>
  );
}
