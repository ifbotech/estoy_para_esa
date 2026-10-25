package main

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/pocketbase/pocketbase/core"
)

// pusher manda avisos Web Push. Las claves VAPID se crean la primera vez y
// quedan en pb_data/vapid.json: si se pierden, cada teléfono tiene que volver
// a activar los avisos (entran en el respaldo diario de pb_data).
type pusher struct {
	app  core.App
	once sync.Once
	keys vapidKeys
	err  error
}

type vapidKeys struct {
	Public  string `json:"public"`
	Private string `json:"private"`
}

func (p *pusher) load() error {
	p.once.Do(func() {
		path := filepath.Join(p.app.DataDir(), "vapid.json")
		if raw, err := os.ReadFile(path); err == nil {
			p.err = json.Unmarshal(raw, &p.keys)
			return
		}
		priv, pub, err := webpush.GenerateVAPIDKeys()
		if err != nil {
			p.err = err
			return
		}
		p.keys = vapidKeys{Public: pub, Private: priv}
		raw, _ := json.Marshal(p.keys)
		p.err = os.WriteFile(path, raw, 0o600)
	})
	return p.err
}

func (p *pusher) publicKey() string {
	if p.load() != nil {
		return ""
	}
	return p.keys.Public
}

// send recibe la suscripción tal como la guarda el navegador (JSON con
// endpoint y keys) y el contenido del aviso. Devuelve el código HTTP del
// servicio de push: 404 o 410 quieren decir que la suscripción ya no existe
// y el hook la borra.
func (p *pusher) send(subscription string, payload string) map[string]any {
	if err := p.load(); err != nil {
		return map[string]any{"status": 0, "error": err.Error()}
	}
	var sub webpush.Subscription
	if err := json.Unmarshal([]byte(subscription), &sub); err != nil {
		return map[string]any{"status": 0, "error": err.Error()}
	}
	res, err := webpush.SendNotification([]byte(payload), &sub, &webpush.Options{
		Subscriber:      "https://ifbotech.com/estoyparaesa/",
		VAPIDPublicKey:  p.keys.Public,
		VAPIDPrivateKey: p.keys.Private,
		TTL:             60 * 60 * 24,
		Urgency:         webpush.UrgencyNormal,
		HTTPClient:      &http.Client{Timeout: 10 * time.Second},
	})
	if err != nil {
		return map[string]any{"status": 0, "error": err.Error()}
	}
	defer res.Body.Close()
	io.Copy(io.Discard, res.Body)
	return map[string]any{"status": res.StatusCode, "error": ""}
}
