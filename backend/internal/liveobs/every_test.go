package liveobs

import (
	"context"
	"errors"
	"testing"
	"testing/synctest"
	"time"
)

func TestEveryRodaACadaIntervaloAteCancelar(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		calls := 0
		done := make(chan struct{})
		go func() {
			defer close(done)
			every(ctx, time.Minute, "teste", func(context.Context) error {
				calls++
				return errors.New("falha só vai para o log")
			})
		}()
		time.Sleep(3*time.Minute + time.Second)
		synctest.Wait()
		cancel()
		<-done
		if calls != 3 {
			t.Errorf("chamadas = %d, quer 3", calls)
		}
	})
}

func TestRunDoColetorParaComOContexto(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		store := &fakeMinutes{}
		c, _ := newCollector(t, []string{scrapeA, scrapeB}, fakeHost{}, store)
		ctx, cancel := context.WithCancel(context.Background())
		done := make(chan struct{})
		go func() {
			defer close(done)
			c.Run(ctx)
		}()
		time.Sleep(2*time.Minute + time.Second)
		synctest.Wait()
		cancel()
		<-done
		if len(store.rows) != 1 {
			t.Errorf("linhas = %d, quer 1 (duas coletas)", len(store.rows))
		}
	})
}

func TestRetentionRunApagaNoBootEACadaHora(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		calls := 0
		p := pruneFunc(func() { calls++ })
		ctx, cancel := context.WithCancel(context.Background())
		done := make(chan struct{})
		go func() {
			defer close(done)
			NewRetention(p).Run(ctx)
		}()
		time.Sleep(time.Hour + time.Second)
		synctest.Wait()
		cancel()
		<-done
		if calls != 2 {
			t.Errorf("limpezas = %d, quer 2 (boot + 1 h)", calls)
		}
	})
}

type pruneFunc func()

func (f pruneFunc) Prune(context.Context, time.Time) error {
	f()
	return nil
}
