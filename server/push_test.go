package main

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/ecdh"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"testing"

	webpush "github.com/SherClockHolmes/webpush-go"
)

// telefono simula un navegador suscripto: tiene sus claves y descifra lo que
// le llega como lo haría el teléfono de verdad (RFC 8291, aes128gcm).
type telefono struct {
	priv *ecdh.PrivateKey
	auth []byte
}

func nuevoTelefono(t *testing.T) *telefono {
	priv, err := ecdh.P256().GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	auth := make([]byte, 16)
	_, _ = rand.Read(auth)
	return &telefono{priv: priv, auth: auth}
}

func (f *telefono) suscripcion(endpoint string) string {
	b64 := base64.RawURLEncoding.EncodeToString
	raw, _ := json.Marshal(map[string]any{
		"endpoint": endpoint,
		"keys":     map[string]string{"p256dh": b64(f.priv.PublicKey().Bytes()), "auth": b64(f.auth)},
	})
	return string(raw)
}

func hkdf(salt, ikm, info []byte, largo int) []byte {
	ext := hmac.New(sha256.New, salt)
	ext.Write(ikm)
	prk := ext.Sum(nil)
	exp := hmac.New(sha256.New, prk)
	exp.Write(info)
	exp.Write([]byte{1})
	return exp.Sum(nil)[:largo]
}

func (f *telefono) descifrar(t *testing.T, cuerpo []byte) []byte {
	t.Helper()
	salt := cuerpo[:16]
	idlen := int(cuerpo[20])
	pubServidor := cuerpo[21 : 21+idlen]
	_ = binary.BigEndian.Uint32(cuerpo[16:20])
	cifrado := cuerpo[21+idlen:]

	ps, err := ecdh.P256().NewPublicKey(pubServidor)
	if err != nil {
		t.Fatal(err)
	}
	secreto, err := f.priv.ECDH(ps)
	if err != nil {
		t.Fatal(err)
	}
	info := append(append([]byte("WebPush: info\x00"), f.priv.PublicKey().Bytes()...), pubServidor...)
	ikm := hkdf(f.auth, secreto, info, 32)
	cek := hkdf(salt, ikm, []byte("Content-Encoding: aes128gcm\x00"), 16)
	nonce := hkdf(salt, ikm, []byte("Content-Encoding: nonce\x00"), 12)
	bloque, _ := aes.NewCipher(cek)
	gcm, _ := cipher.NewGCM(bloque)
	plano, err := gcm.Open(nil, nonce, cifrado, nil)
	if err != nil {
		t.Fatalf("no se pudo descifrar: %v", err)
	}
	plano = bytes.TrimRight(plano, "\x00")
	if len(plano) == 0 || plano[len(plano)-1] != 2 {
		t.Fatalf("falta el delimitador del último registro")
	}
	return plano[:len(plano)-1]
}

func clavesDePrueba(t *testing.T) vapidKeys {
	priv, pub, err := webpush.GenerateVAPIDKeys()
	if err != nil {
		t.Fatal(err)
	}
	return vapidKeys{Public: pub, Private: priv}
}

func TestEnviarUnoLlegaCifradoYConEncabezados(t *testing.T) {
	tel := nuevoTelefono(t)
	keys := clavesDePrueba(t)
	var recibido *http.Request
	var cuerpo []byte
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		recibido = r
		cuerpo, _ = io.ReadAll(r.Body)
		w.WriteHeader(http.StatusCreated)
	}))
	defer srv.Close()

	payload := `{"title":"Plancito nuevo ✨","body":"Rocío sumó «Ramen»","url":"#/plan/abc","tag":"plan-abc"}`
	r := enviarUno(srv.Client(), keys, tel.suscripcion(srv.URL+"/push/1"), payload)
	if r.Status != http.StatusCreated || r.Error != "" || clasificar(r) != accionOK {
		t.Fatalf("resultado inesperado: %+v", r)
	}
	if got := string(tel.descifrar(t, cuerpo)); got != payload {
		t.Fatalf("el teléfono leyó %q", got)
	}
	h := recibido.Header
	if h.Get("Content-Encoding") != "aes128gcm" {
		t.Errorf("Content-Encoding = %q", h.Get("Content-Encoding"))
	}
	if h.Get("TTL") != "86400" {
		t.Errorf("TTL = %q, quería un día", h.Get("TTL"))
	}
	if h.Get("Urgency") != "high" {
		t.Errorf("Urgency = %q, quería high", h.Get("Urgency"))
	}
	if h.Get("Topic") != topico("plan-abc") {
		t.Errorf("Topic = %q", h.Get("Topic"))
	}
	auth := h.Get("Authorization")
	if !strings.HasPrefix(auth, "vapid t=") || !strings.Contains(auth, ", k="+keys.Public) {
		t.Errorf("Authorization VAPID mal formado: %q", auth)
	}
	// el sub del JWT tiene que ser https o mailto (Apple rechaza lo demás)
	jwt := strings.TrimPrefix(strings.SplitN(auth, ",", 2)[0], "vapid t=")
	partes := strings.Split(jwt, ".")
	claims, _ := base64.RawURLEncoding.DecodeString(partes[1])
	var c map[string]any
	_ = json.Unmarshal(claims, &c)
	if c["sub"] != "https://ifbotech.com/estoyparaesa/" {
		t.Errorf("sub del JWT = %v", c["sub"])
	}
	if !strings.HasPrefix(c["aud"].(string), srv.URL) {
		t.Errorf("aud del JWT = %v", c["aud"])
	}
}

func TestOpcionesDelAviso(t *testing.T) {
	keys := clavesDePrueba(t)
	o := opcionesDe(`{"tag":"x","ttl":3600,"urgencia":"normal"}`, keys)
	if o.TTL != 3600 || o.Urgency != webpush.UrgencyNormal {
		t.Fatalf("no respetó ttl y urgencia: %+v", o)
	}
	o = opcionesDe(`{}`, keys)
	if o.Topic != "" || o.TTL != 86400 || o.Urgency != webpush.UrgencyHigh {
		t.Fatalf("defaults raros: %+v", o)
	}
}

func TestTopicoValido(t *testing.T) {
	valido := regexp.MustCompile(`^[A-Za-z0-9_-]{1,32}$`)
	for _, tag := range []string{"plan-abc123", "decidir-xyz", "recordatorio-un-tag-larguísimo-con-tildes-y-más-de-32-caracteres"} {
		if tp := topico(tag); !valido.MatchString(tp) {
			t.Errorf("topic inválido para %q: %q", tag, tp)
		}
	}
	if topico("a") == topico("b") {
		t.Error("dos tags distintos dieron el mismo topic")
	}
}

func TestClasificar(t *testing.T) {
	casos := map[int]int{201: accionOK, 200: accionOK, 404: accionBorrar, 410: accionBorrar, 403: accionFalla, 429: accionFalla, 500: accionFalla, 0: accionFalla}
	for status, quiero := range casos {
		if got := clasificar(resultado{Status: status}); got != quiero {
			t.Errorf("status %d: %d, quería %d", status, got, quiero)
		}
	}
}

func TestSuscripcionRotaNoExplota(t *testing.T) {
	keys := clavesDePrueba(t)
	for _, sub := range []string{`no es json`, `{"endpoint":""}`, `{"endpoint":"https://x","keys":{}}`} {
		r := enviarUno(http.DefaultClient, keys, sub, `{}`)
		if r.Error == "" || clasificar(r) != accionFalla {
			t.Errorf("%s: %+v", sub, r)
		}
	}
}
