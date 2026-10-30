/** Uma seção do painel de observabilidade. */
export function Panel({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <h2 className="text-ds-md font-semibold text-strong">{title}</h2>
      {children}
    </section>
  )
}

/** Tabela que rola na horizontal no celular. */
export function ScrollTable({
  head,
  children
}: {
  head: string[]
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="overflow-x-auto rounded-lg bg-surface">
      <table className="w-full min-w-max text-left text-ds-sm">
        <thead className="text-gray-400">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-gray-200 [&_td]:px-3 [&_td]:py-2 [&_td]:tabular-nums [&_tr]:border-t [&_tr]:border-subtle">
          {children}
        </tbody>
      </table>
    </div>
  )
}

export function Empty({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <p className="text-ds-sm text-gray-400">{children}</p>
}
