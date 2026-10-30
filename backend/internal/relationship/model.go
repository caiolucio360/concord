// Package relationship diz que vínculo quem vê tem com outra pessoa: ela
// mesma, amizade aceita ou pelo menos um servidor em comum. Sem vínculo, a
// pessoa só aparece com o nome de exibição e a customização do perfil (sem o
// @ e sem os atalhos para mensagem e amizade).
package relationship

// Kind é o vínculo de quem vê com a pessoa vista. Vai no JSON como
// `relationship` para o app decidir o que mostrar.
type Kind string

const (
	Self         Kind = "self"
	Friend       Kind = "friend"
	SharedServer Kind = "shared_server"
	None         Kind = "none"
)

// Linked: há vínculo. Vínculo desconhecido (vazio) conta como sem vínculo.
func (k Kind) Linked() bool {
	return k == Self || k == Friend || k == SharedServer
}
