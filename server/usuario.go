package main

import (
	"errors"
	"fmt"
	"os"

	"github.com/pocketbase/pocketbase/core"
	"github.com/spf13/cobra"
)

// usuarioCmd crea o actualiza una cuenta de la app. La contraseña llega por
// la variable EPE_PASSWORD para que no quede en el historial ni en `ps`.
//
//	EPE_PASSWORD=... estoyparaesa usuario --slug inaki --nombre Iñaki --email ifbarnetche@gmail.com
func usuarioCmd(app core.App) *cobra.Command {
	var slug, nombre, email, color string
	cmd := &cobra.Command{
		Use:   "usuario",
		Short: "Crea o actualiza una cuenta (contraseña en EPE_PASSWORD)",
		RunE: func(cmd *cobra.Command, args []string) error {
			if slug == "" || nombre == "" || email == "" {
				return errors.New("faltan --slug, --nombre o --email")
			}
			if err := app.RunAllMigrations(); err != nil {
				return err
			}
			users, err := app.FindCollectionByNameOrId("users")
			if err != nil {
				return err
			}
			rec, err := app.FindFirstRecordByData(users, "slug", slug)
			nuevo := err != nil
			if nuevo {
				rec = core.NewRecord(users)
				rec.Set("slug", slug)
			}
			rec.Set("name", nombre)
			rec.SetEmail(email)
			rec.SetVerified(true)
			if color != "" {
				rec.Set("color", color)
			}
			if pass := os.Getenv("EPE_PASSWORD"); pass != "" {
				rec.SetPassword(pass)
			} else if nuevo {
				return errors.New("una cuenta nueva necesita EPE_PASSWORD")
			}
			if err := app.Save(rec); err != nil {
				return err
			}
			if nuevo {
				fmt.Printf("cuenta creada: %s (%s)\n", nombre, slug)
			} else {
				fmt.Printf("cuenta actualizada: %s (%s)\n", nombre, slug)
			}
			return nil
		},
	}
	cmd.Flags().StringVar(&slug, "slug", "", "identificador corto (inaki, rocio)")
	cmd.Flags().StringVar(&nombre, "nombre", "", "nombre que muestra la app")
	cmd.Flags().StringVar(&email, "email", "", "email de la cuenta")
	cmd.Flags().StringVar(&color, "color", "", "color de la persona (#rrggbb)")
	return cmd
}
