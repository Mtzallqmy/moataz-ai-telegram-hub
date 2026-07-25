import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: "تواصل معنا",
  description: "تواصل مع فريق منصة معتز للذكاء الاصطناعي.",
};

export default function ContactPage() {
  return (
    <main className="contact-page shell">
      <section className="contact-copy">
        <span className="eyebrow">قناة تواصل آمنة</span>
        <h1>تواصل معنا</h1>
        <p>للاقتراحات، المساهمات، الشراكات، أو الإبلاغ عن مشكلة تقنية. تُحفظ الرسائل بصورة خاصة ولا تظهر للعامة.</p>
        <div className="contact-note"><b>وقت الاستجابة</b><span>تتم مراجعة الرسائل حسب الأولوية، مع عدم إرسال أي بيانات حساسة أو مفاتيح API داخل النموذج.</span></div>
      </section>
      <ContactForm />
    </main>
  );
}
