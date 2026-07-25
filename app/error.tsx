"use client";
export default function ErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){return <main className="page-shell"><section className="state-card"><span className="state-icon">!</span><h1>حدث خطأ غير متوقع</h1><p>لم نعرض التفاصيل التقنية حفاظًا على الأمان. حاول مرة أخرى.</p><button className="button primary" onClick={reset}>إعادة المحاولة</button></section></main>;}
