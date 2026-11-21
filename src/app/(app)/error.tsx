"use client";
import { useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

/** Granica błędów: błąd w jednym ekranie nie zastępuje całej aplikacji komunikatem przeglądarki. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="card err" role="alert">
      <h1 style={{ marginTop: 0 }}>Coś poszło nie tak na tej stronie</h1>
      <p className="muted">Wprowadzone dane mogły być niepełne (np. niedokończona data). Spróbuj ponownie – reszta aplikacji działa normalnie.</p>
      <div className="row">
        <button className="btn btn-primary" onClick={reset}><Icon name="back" size={18} /> Spróbuj ponownie</button>
        <Link href="/pulpit" className="btn btn-outline">Przejdź do panelu</Link>
      </div>
    </div>
  );
}
