package main

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

// pusher manda avisos Web Push. Las claves VAPID se crean la primera vez y
// quedan en pb_data/vapid.json: si se pierden, cada teléfono tiene que volver
// a activar los avisos (entran en el respaldo diario de pb_data).
//
// Los hooks llaman a $epe.notificar / $epe.notificarA: el envío sale en
// segundo plano y en paralelo, así el que hizo el cambio no espera a Apple o
// a Google. Cada suscripción guarda su último envío bueno y su último error
// (se ven en Más → Avisos), y las que el servicio da por muertas se borran.
type pusher struct {
	app  core.App
	once sync.Once
	keys vapidKeys
	err  error
	// para los tests: dónde mandar en lugar del endpoint real
	cliente *http.Client
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

// aviso es lo que mandan los hooks. Además de lo que muestra el teléfono
// (title, body, url, tag), puede traer cuánto vale la pena entregarlo
// (ttl, en segundos) y la urgencia.
type aviso struct {
	Tag      string `json:"tag"`
	TTL      int    `json:"ttl"`
	Urgencia string `json:"urgencia"`
}

// opcionesDe arma los encabezados del envío a partir del aviso:
//   - Topic: los avisos pendientes con el mismo tag se reemplazan en el
//     servicio de push (si el teléfono estaba apagado, le llega el último).
//   - TTL: por defecto un día; los recordatorios usan menos.
//   - Urgency: "high" por defecto, para que iOS y Android no los demoren.
func opcionesDe(payload string, keys vapidKeys) *webpush.Options {
	var a aviso
	_ = json.Unmarshal([]byte(payload), &a)
	ttl := a.TTL
	if ttl <= 0 {
		ttl = 60 * 60 * 24
	}
	urgencia := webpush.UrgencyHigh
	switch a.Urgencia {
	case "normal":
		urgencia = webpush.UrgencyNormal
	case "low":
		urgencia = webpush.UrgencyLow
	}
	return &webpush.Options{
		Subscriber:      "https://ifbotech.com/estoyparaesa/",
		VAPIDPublicKey:  keys.Public,
		VAPIDPrivateKey: keys.Private,
		TTL:             ttl,
		Urgency:         urgencia,
		Topic:           topico(a.Tag),
	}
}

// topico convierte un tag («plan-abc123») en un Topic válido: hasta 32
// caracteres del alfabeto base64 para URLs.
func topico(tag string) string {
	if tag == "" {
		return ""
	}
	h := sha256.Sum256([]byte(tag))
	return base64.RawURLEncoding.EncodeToString(h[:])[:32]
}

// resultado de mandarle un aviso a una suscripción.
type resultado struct {
	Status int    `json:"status"`
	Error  string `json:"error"`
}

// enviarUno manda un aviso a una suscripción (el JSON que guarda el navegador).
func enviarUno(cliente *http.Client, keys vapidKeys, subscription string, payload string) resultado {
	var sub webpush.Subscription
	if err := json.Unmarshal([]byte(subscription), &sub); err != nil {
		return resultado{Error: "suscripción ilegible: " + err.Error()}
	}
	if sub.Endpoint == "" || sub.Keys.P256dh == "" || sub.Keys.Auth == "" {
		return resultado{Error: "suscripción incompleta"}
	}
	o := opcionesDe(payload, keys)
	o.HTTPClient = cliente
	res, err := webpush.SendNotification([]byte(payload), &sub, o)
	if err != nil {
		return resultado{Error: err.Error()}
	}
	defer res.Body.Close()
	cuerpo, _ := io.ReadAll(io.LimitReader(res.Body, 300))
	r := resultado{Status: res.StatusCode}
	if res.StatusCode >= 300 {
		r.Error = strings.TrimSpace(string(cuerpo))
		if r.Error == "" {
			r.Error = http.StatusText(res.StatusCode)
		}
	}
	return r
}

// Qué hacer con la suscripción según cómo salió el envío.
const (
	accionOK = iota
	accionBorrar
	accionFalla
)

// clasificar: 2xx anduvo; 404/410 la suscripción ya no existe (el teléfono
// desinstaló la app, cambió los permisos o el navegador la renovó) y se
// borra; lo demás es una falla, que se anota.
func clasificar(r resultado) int {
	switch {
	case r.Status >= 200 && r.Status < 300:
		return accionOK
	case r.Status == http.StatusNotFound || r.Status == http.StatusGone:
		return accionBorrar
	default:
		return accionFalla
	}
}

// maxFallos: una suscripción que falla tantas veces seguidas (por ejemplo,
// creada con otras claves VAPID) se borra; la app la vuelve a crear sola la
// próxima vez que se abre.
const maxFallos = 5

func (p *pusher) http() *http.Client {
	if p.cliente != nil {
		return p.cliente
	}
	return &http.Client{Timeout: 15 * time.Second}
}

// enviarA manda el aviso a esas suscripciones, en paralelo, y anota cómo le
// fue a cada una. Devuelve los resultados en el mismo orden.
func (p *pusher) enviarA(subs []*core.Record, payload string) []resultado {
	res := make([]resultado, len(subs))
	if err := p.load(); err != nil {
		for i := range res {
			res[i] = resultado{Error: err.Error()}
		}
		return res
	}
	var wg sync.WaitGroup
	cliente := p.http()
	for i, s := range subs {
		wg.Add(1)
		go func(i int, s *core.Record) {
			defer wg.Done()
			res[i] = enviarUno(cliente, p.keys, textoJSON(s.Get("suscripcion")), payload)
		}(i, s)
	}
	wg.Wait()
	for i, s := range subs {
		p.anotar(s, res[i])
	}
	return res
}

// textoJSON: el campo json de la suscripción, como texto.
func textoJSON(v any) string {
	switch x := v.(type) {
	case types.JSONRaw:
		return string(x)
	case []byte:
		return string(x)
	case string:
		return x
	default:
		b, _ := json.Marshal(x)
		return string(b)
	}
}

func (p *pusher) anotar(s *core.Record, r resultado) {
	switch clasificar(r) {
	case accionOK:
		s.Set("ultimo_ok", types.NowDateTime())
		s.Set("ultimo_error", "")
		s.Set("fallos", 0)
	case accionBorrar:
		if err := p.app.Delete(s); err != nil {
			p.app.Logger().Warn("no se pudo borrar una suscripción vencida", "error", err)
		}
		return
	default:
		fallos := s.GetInt("fallos") + 1
		if fallos >= maxFallos {
			p.app.Logger().Warn("suscripción borrada después de fallar seguido", "usuario", s.GetString("usuario"), "status", r.Status, "error", r.Error)
			_ = p.app.Delete(s)
			return
		}
		s.Set("fallos", fallos)
		msg := r.Error
		if r.Status > 0 {
			msg = http.StatusText(r.Status) + ": " + msg
		}
		if len(msg) > 280 {
			msg = msg[:280]
		}
		s.Set("ultimo_error", msg)
		p.app.Logger().Warn("push fallido", "usuario", s.GetString("usuario"), "status", r.Status, "error", r.Error)
	}
	if err := p.app.SaveNoValidate(s); err != nil {
		p.app.Logger().Warn("no se pudo anotar el envío", "error", err)
	}
}

func (p *pusher) suscripciones(filtro string, params dbx.Params) []*core.Record {
	subs, err := p.app.FindRecordsByFilter("push_subs", filtro, "", 200, 0, params)
	if err != nil {
		p.app.Logger().Warn("no se pudieron leer las suscripciones", "error", err)
		return nil
	}
	return subs
}

// notificar: a todos menos a `excepto` (quien hizo el cambio). En segundo plano.
func (p *pusher) notificar(excepto string, payload string) {
	go p.enviarA(p.suscripciones("usuario != {:u}", dbx.Params{"u": excepto}), payload)
}

// notificarA: sólo a `usuario` (por ejemplo, un recordatorio que es para vos). En segundo plano.
func (p *pusher) notificarA(usuario string, payload string) {
	if usuario == "" {
		return
	}
	go p.enviarA(p.suscripciones("usuario = {:u}", dbx.Params{"u": usuario}), payload)
}

// probar: a los teléfonos de `usuario`, esperando el resultado de cada uno.
func (p *pusher) probar(usuario string, payload string) []map[string]any {
	subs := p.suscripciones("usuario = {:u}", dbx.Params{"u": usuario})
	res := p.enviarA(subs, payload)
	out := make([]map[string]any, len(subs))
	for i, s := range subs {
		out[i] = map[string]any{
			"id":          s.Id,
			"dispositivo": s.GetString("dispositivo"),
			"status":      res[i].Status,
			"error":       res[i].Error,
			"ok":          clasificar(res[i]) == accionOK,
		}
	}
	return out
}

// send es la versión vieja (una suscripción, esperando), que queda por si
// algún hook la usa. Los nuevos usan notificar.
func (p *pusher) send(subscription string, payload string) map[string]any {
	if err := p.load(); err != nil {
		return map[string]any{"status": 0, "error": err.Error()}
	}
	r := enviarUno(p.http(), p.keys, subscription, payload)
	return map[string]any{"status": r.Status, "error": r.Error}
}
