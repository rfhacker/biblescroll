export function Menu({ onNavigate, onClose }: {
  onNavigate: (p: 'feelings' | 'search' | 'favorites' | 'about') => void
  onClose: () => void
}) {
  const go = (p: 'feelings' | 'search' | 'favorites' | 'about') => { onNavigate(p); onClose() }
  return (
    <>
      <div className="menu-scrim" onClick={onClose} />
      <nav className="menu-sheet" aria-label="Menu">
        <button onClick={() => go('feelings')}>How are you feeling?</button>
        <button onClick={() => go('search')}>Search</button>
        <button onClick={() => go('favorites')}>Saved</button>
        <button onClick={() => go('about')}>About</button>
      </nav>
    </>
  )
}
