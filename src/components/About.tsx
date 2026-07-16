export function About({ onClose }: { onClose: () => void }) {
  return (
    <div className="panel">
      <header className="panel-head">
        <h1>About</h1>
        <button aria-label="Close" onClick={onClose}>✕</button>
      </header>
      <div className="about-body">
        <p>JesusFeed turns idle scrolling into time in the Word — verses, trivia, maps, and glimpses into the world of the Bible, one card at a time.</p>
        <p>Scripture quotations are from the <strong>World English Bible (WEB)</strong>, a public-domain modern English translation.</p>
        <p>Maps are drawn from <strong>Natural Earth</strong>, a public-domain map dataset.</p>
        <p>Commentary: Matthew Henry's <strong>Concise</strong> and <strong>Complete</strong> commentaries, and <strong>Jamieson-Fausset-Brown</strong> (public domain).</p>
        <p>Everything stays on your device. No account, no ads, no tracking — just Scripture.</p>
        <p className="verse-ref">"Your word is a lamp to my feet, and a light for my path." — Psalm 119:105</p>
      </div>
    </div>
  )
}
