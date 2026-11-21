"use client";
import Icon from "@/components/Icon";
import { useApp } from "@/components/AppContext";
import { Status } from "@/components/ui";

const GENERAL = [
  { t: "Umowa lub działalność „dla pozoru”", d: "Zawarcie umowy lub założenie działalności wyłącznie po to, by objąć się ubezpieczeniem chorobowym i uzyskać zasiłki. ZUS po postępowaniu może wydać decyzję o niepodleganiu ubezpieczeniom – wtedy zasiłki nie przysługują.", a: "Praca/działalność musi być faktycznie wykonywana. Zachowuj dowody: umowy z kontrahentami, faktury, korespondencję, ewidencję czasu pracy." },
  { t: "Podwyższenie podstawy składek w ciąży", d: "Znaczące podniesienie podstawy wymiaru składek w ciąży wyłącznie w celu uzyskania wyższych świadczeń. ZUS może ustalić niższą podstawę – zasiłek będzie niższy.", a: "Deklaruj podstawę adekwatną do realnych przychodów; zmiany uzasadniaj sytuacją biznesową." },
  { t: "Brak ubezpieczenia chorobowego w dniu porodu", d: "Niezgłoszenie do dobrowolnego ubezpieczenia, rozwiązanie umowy, zakończenie działalności lub umowy zlecenia przed porodem – wyrejestrowanie z ubezpieczenia chorobowego oznacza brak prawa do zasiłku macierzyńskiego.", a: "Zaplanuj zatrudnienie tak, by trwało w dniu porodu. Pracownice na umowie terminowej – umowa przedłuża się do dnia porodu (po 3. miesiącu ciąży)." },
  { t: "Nieterminowe składki (dobrowolne chorobowe)", d: "Nieopłacenie składki w terminie może skutkować ustaniem dobrowolnego ubezpieczenia chorobowego.", a: "Opłacaj składki w terminie; w razie spóźnienia złóż wniosek o przywrócenie terminu." },
  { t: "Składki do uregulowania (przedsiębiorca)", d: "Zasiłek dla osoby prowadzącej działalność wypłacany jest po uregulowaniu należności z tytułu składek na dzień powstania prawa.", a: "Sprawdź stan rozliczeń (zakładka ZUS → Do uregulowania), rozważ układ ratalny." },
  { t: "Praca w czasie zwolnienia lekarskiego", d: "Wykonywanie pracy zarobkowej lub wykorzystywanie zwolnienia niezgodnie z celem to utrata zasiłku za cały okres zwolnienia.", a: "W czasie e-ZLA powstrzymaj się od pracy – także na zleceniu i w działalności." },
  { t: "Przekroczone terminy wniosków", d: "Wniosek o 81,5% – do 21 dni po porodzie; o rodzicielski bezpośrednio po macierzyńskim – do 21 dni po porodzie; dokumenty o zasiłek – do 6 miesięcy.", a: "Ustaw przypomnienia na podstawie terminów z Kalkulatora." },
  { t: "Niewykorzystane 9 tygodni drugiego rodzica", d: "Część urlopu rodzicielskiego (9 tyg.) przysługuje wyłącznie każdemu z rodziców – nie da się jej przekazać; jeśli nie zostanie wykorzystana, przepada.", a: "Zaplanujcie wspólnie podział urlopu w Kalkulatorze." },
  { t: "Zmiany warunków zatrudnienia w ciąży", d: "Zmiana etatu, wynagrodzenia lub rodzaju umowy w ciąży wpływa na podstawę wymiaru i prawo do zasiłku.", a: "Przed zmianą sprawdź skutki w Kalkulatorze i skonsultuj z ZUS." },
];

export default function Ryzyka() {
  const { profile } = useApp();
  return (
    <div>
      {profile?.risks && (
        <div className="card mb" data-guide="t-ryzyka-twoje">
          <h2>Twoje ryzyka – na podstawie danych z ZUS</h2>
          <div className="list">
            {profile.risks.map((r: any, i: number) => (
              <div key={i} className="li"><Status s={r.level} /><div className="grow"><b>{r.title}</b><br /><span style={{ fontSize: 14 }}>{r.text}</span><br /><small><b>Co zrobić:</b> {r.action}</small></div></div>
            ))}
          </div>
        </div>
      )}
      <h2>Zagrożenia utraty lub obniżenia świadczeń</h2>
      <div className="grid g2" data-guide="t-ryzyka-ogolne">
        {GENERAL.map((g) => (
          <div key={g.t} className="card warn" style={{ margin: 0 }}>
            <div className="row" style={{ gap: 10, alignItems: "flex-start" }}><span style={{ color: "var(--warn)" }}><Icon name="alert" /></span><h3 style={{ flex: 1 }}>{g.t}</h3></div>
            <p style={{ fontSize: 14 }}>{g.d}</p>
            <div className="alert a-ok"><Icon name="check" size={18} /><span>{g.a}</span></div>
          </div>
        ))}
      </div>
      <div className="card mt" data-guide="t-ryzyka-ochrona">
        <h2>Szczególna ochrona pracownic i pracowników (Kodeks pracy)</h2>
        <p style={{ fontSize: 14 }}>W okresie ciąży, urlopu macierzyńskiego oraz od dnia złożenia wniosku o urlop macierzyński, na warunkach macierzyńskiego, uzupełniający, ojcowski lub rodzicielski – do dnia jego zakończenia – pracodawca nie może przygotowywać ani dokonywać wypowiedzenia lub rozwiązania umowy (wyjątki: przyczyny z winy pracownika za zgodą związku zawodowego, upadłość/likwidacja). Umowa terminowa lub próbna powyżej 1 miesiąca, która rozwiązałaby się po 3. miesiącu ciąży, przedłuża się do dnia porodu.</p>
        <p className="muted" style={{ fontSize: 14 }}>Ochrona nie dotyczy osób niebędących pracownikami (np. prowadzących działalność, zleceniobiorców).</p>
      </div>
    </div>
  );
}
