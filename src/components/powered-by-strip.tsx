// Pie de página visible en todas las pantallas. NO es fixed: forma parte del
// flujo normal del documento, así que solo aparece cuando el usuario hace
// scroll hasta el final de la página. Se monta una sola vez en App.tsx como
// hermano de <Routes>.

export function PoweredByStrip() {
  return (
    <footer
      role="contentinfo"
      className="flex h-6 w-full items-center justify-center bg-[#2F4F4F] px-4 text-[10px] font-semibold uppercase tracking-[0.35em] text-white"
    >
      Powered by · Gnerai
    </footer>
  )
}
