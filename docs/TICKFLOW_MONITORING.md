# Ultimate → météo des flux Tickflow

Ultimate publie ses exécutions vers le monitoring Tickflow, qui affiche la météo par client, projet et flux.

## Ce qui est publié

- **À chaque exécution terminée** d'un flux de production rattaché (manuelle, CRON, webhook, passerelle) : un passage (`POST /runs`, identifiant `ultimate:<executionId>`) puis l'état du flux (`POST /status`).
- **Toutes les 10 minutes** (worker) : l'état de tous les flux rattachés (`POST /status/batch`), déduit de la dernière exécution terminée. Ce battement évite qu'un flux peu fréquent soit classé « agent silencieux ».

| Dernière exécution | État Tickflow | Incident |
|---|---|---|
| `SUCCESS` | ok | aucun |
| `PARTIAL` | warning | `x_execution_partial` |
| `FAILED` | critical | `x_execution_failed` |
| aucune | unknown | aucun |

Les dry-runs et les flux `STAGING` ne sont jamais publiés. Seuls les compteurs, le message d'erreur (300 caractères) et l'identifiant d'exécution sortent d'Ultimate ; aucune donnée métier. Une panne de Tickflow ne fait jamais échouer une exécution.

## Activation

1. Dans Tickflow, créer un agent serveur couvrant les clients concernés avec le code serveur `ultimate`, et déclarer chaque flux (connecteur `ediconnect_ultimate`, serveur `ultimate`).
2. Dans `.env.production` (API et worker) :

```
TICKFLOW_MONITORING_URL=https://hoejlezzprkitgfrqmvl.supabase.co/functions/v1/bdc-monitoring/api/v1
TICKFLOW_MONITORING_TOKEN=<jeton du coffre>
TICKFLOW_SERVER_CODE=ultimate
```

3. Rattacher chaque flux Ultimate dans son `triggerConfig` :

```json
{ "tickflow": { "clientCode": "<code client Tickflow>", "flowCode": "<code du flux Tickflow>" } }
```

4. Redéployer l'API **et le worker** (le workflow de déploiement actuel ne reconstruit pas le worker).

Sans URL ni jeton, ou sans bloc `tickflow`, rien n'est envoyé.
