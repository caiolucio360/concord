import type { PollAnswer } from '../api/messages'
import { votesLabel } from '../lib/polls'
import { PollAnswerMedia } from './PollAnswerMedia'

interface PollAnswerRowProps {
  answer: PollAnswer
  percent: number
  isSelected: boolean
  isWinner: boolean
  /** Já votou, encerrou ou espiou: mostra a barra e a porcentagem em vez da caixinha. */
  showResults: boolean
  multiselect: boolean
  disabled: boolean
  onToggle: () => void
}

function rowTone(isSelected: boolean, myVoteShown: boolean): string {
  if (isSelected) return 'border-brand bg-brand/15'
  return myVoteShown ? 'border-brand/60 bg-fg/[0.04]' : 'border-subtle bg-fg/[0.04]'
}

function rowRole(showResults: boolean, multiselect: boolean): string {
  if (showResults) return 'listitem'
  return multiselect ? 'checkbox' : 'radio'
}

/** Uma resposta da enquete: escolher (caixinha) ou ver o resultado (barra e %). */
function PollAnswerRow({
  answer,
  percent,
  isSelected,
  isWinner,
  showResults,
  multiselect,
  disabled,
  onToggle
}: PollAnswerRowProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      role={rowRole(showResults, multiselect)}
      aria-checked={showResults ? undefined : isSelected}
      className={`relative flex min-h-11 w-full items-center gap-3 overflow-hidden rounded-lg border px-3 py-2 text-left transition-colors ${rowTone(
        isSelected,
        answer.me_voted && showResults
      )} ${showResults ? 'cursor-default' : 'cursor-pointer hover:border-strong hover:bg-fg/[0.07]'}`}
    >
      {showResults && (
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 left-0 transition-[width] duration-500 ${
            isWinner ? 'bg-success/25' : 'bg-brand/20'
          }`}
          style={{ width: `${percent}%` }}
        />
      )}
      <PollAnswerMedia answer={answer} />
      <span className="relative min-w-0 flex-1 break-words text-sm font-medium text-gray-100">
        {answer.text}
      </span>
      {showResults ? (
        <span className="relative flex shrink-0 items-center gap-2 text-xs font-semibold text-gray-300">
          {answer.me_voted && (
            <span className="text-brand" title="Seu voto">
              ✓
            </span>
          )}
          <span title={votesLabel(answer.count)}>{percent}%</span>
        </span>
      ) : (
        <span
          aria-hidden="true"
          className={`relative flex h-5 w-5 shrink-0 items-center justify-center border-2 text-[11px] text-white ${
            multiselect ? 'rounded-md' : 'rounded-full'
          } ${isSelected ? 'border-brand bg-brand' : 'border-gray-500'}`}
        >
          {isSelected && '✓'}
        </span>
      )}
    </button>
  )
}

export default PollAnswerRow
