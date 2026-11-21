import Link from "next/link";
import { Brand } from "@/components/Shell";

export const metadata = { title: "Nie znaleziono strony – Przewodnik Rodzica" };

export default function NotFound() {
  return (
    <div className="login-wrap">
      <header className="header"><div className="header-in"><Brand /></div></header>
      <main className="login-main" id="tresc">
        <div className="card" style={{ maxWidth: 560, width: "100%" }}>
          <h1 style={{ marginTop: 0 }}>Nie znaleziono strony</h1>
          <p className="muted">Ten adres nie istnieje albo strona została przeniesiona.</p>
          <div className="row">
            <Link href="/pulpit" className="btn btn-primary">Przejdź do panelu</Link>
            <Link href="/" className="btn btn-outline">Strona logowania</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
