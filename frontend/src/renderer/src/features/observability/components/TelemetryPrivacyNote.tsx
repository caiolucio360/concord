/** Configurações → Privacidade: o que a telemetria das calls e lives manda (ADR 0029). */
export function TelemetryPrivacyNote(): React.JSX.Element {
  return (
    <section className="border-b border-subtle pb-6">
      <h2 className="mb-3 text-ds-sm font-medium text-gray-400">Estatísticas das calls e lives</h2>
      <p className="text-ds-md text-gray-300">
        Durante calls e lives, o app manda ao servidor números técnicos da conexão e do vídeo
        (qualidade, codec, perda de pacotes, placa de vídeo e sistema) para a gente ver onde as
        transmissões travam. Nada do que você fala, escreve ou mostra é enviado. Os números ficam
        guardados por 14 dias e só os devs veem.
      </p>
    </section>
  )
}
