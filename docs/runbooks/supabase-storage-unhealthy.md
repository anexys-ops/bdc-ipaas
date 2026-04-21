# Runbook : conteneur `supabase-storage` unhealthy

Contexte : ticket Linear **BDC-65** — stack Supabase sur le serveur `ultimate` (hors dépôt `bdc-ipaas`).

## Diagnostic

1. Sur le serveur où tourne Supabase :

   ```bash
   docker logs supabase-storage --tail 120
   ```

2. Vérifier les variables du service storage (S3, buckets, clés) dans le compose utilisé (ex. `/opt/supabase-stack/docker-compose.yml`).

3. Inspecter la healthcheck Docker du service `storage` et la comparer au port réellement exposé.

## Actions courantes

- Redémarrer uniquement le service storage après correction de config.
- Si migration de version d’image : aligner les variables avec la [documentation Supabase self-hosted](https://supabase.com/docs/guides/self-hosting).

## Suivi

Documenter la cause racine et la correction dans le ticket Linear une fois résolu sur l’infra.
