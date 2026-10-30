package relationship

import "testing"

func TestLinkedSoComVinculoConhecido(t *testing.T) {
	cases := map[Kind]bool{Self: true, Friend: true, SharedServer: true, None: false, "": false}
	for k, want := range cases {
		if got := k.Linked(); got != want {
			t.Errorf("%q.Linked() = %v, quer %v", k, got, want)
		}
	}
}
