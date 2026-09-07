const backlog = [
  "Navrhnut prvy tyzdenny plan",
  "Rozdelit ulohy podla priority",
  "Skontrolovat kapacity timu",
  "Pripravit denny fokus"
];

const calendar = [
  ["Pondelok", "Strategia", "2 ulohy"],
  ["Utorok", "Produkt", "3 ulohy"],
  ["Streda", "Realizacia", "4 ulohy"],
  ["Stvrtok", "Kontrola", "2 ulohy"],
  ["Piatok", "Vyhodnotenie", "1 uloha"]
];

export default function Home() {
  return (
    <main className="shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">AI Planner</p>
            <h1>Plan prace, ktory drzi smer bez mikromanazmentu.</h1>
          </div>
          <button>Nova uloha</button>
        </header>

        <div className="grid">
          <aside className="panel">
            <h2>Sklad uloh</h2>
            <div className="taskList">
              {backlog.map((task) => (
                <article className="task" key={task}>
                  <span />
                  <p>{task}</p>
                </article>
              ))}
            </div>
          </aside>

          <section className="calendar">
            <div className="calendarHeader">
              <h2>Tyzdenny kalendar</h2>
              <p>Prva funkcna obrazovka pre testovacie nasadenie.</p>
            </div>
            <div className="days">
              {calendar.map(([day, focus, load]) => (
                <article className="day" key={day}>
                  <p>{day}</p>
                  <h3>{focus}</h3>
                  <span>{load}</span>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
