-- Seed exemples : messages EDIFACT (db_demo) + entrées marketplace (anexys_master).
-- À exécuter : voir scripts/seed-examples.ts ou appeler ce SQL depuis les bases concernées.

-- ========== À exécuter dans db_demo (tenant demo) ==========
-- INSERT INTO "EdifactMessage" (id, type, direction, sender, receiver, "rawContent", "parsedData", reference, status, "processedAt")
-- VALUES
--   (gen_random_uuid()::text, 'ORDERS', 'INBOUND', 'FR001', 'DE999', 'UNB+UNOC:3+FR001:14+DE999:14+240315:1234+1''\nUNH+1+ORDERS:D:96A:UN''\nBGM+220+ORD-2024-001+9''\nDTM+137:202403151200:203''\nNAD+BY+FR001::9''\nNAD+SU+DE999::9''\nLIN+1++4012345678901:EN''\nQTY+21:100''\nUNT+8+1''\nUNZ+1+1''', '{"reference":"ORD-2024-001","lineCount":1}'::jsonb, 'ORD-2024-001', 'PROCESSED', now()),
--   (gen_random_uuid()::text, 'INVOIC', 'INBOUND', 'FR001', 'DE999', 'UNB+UNOC:3+FR001:14+DE999:14+240316:0930+2''\nUNH+1+INVOIC:D:96A:UN''\nBGM+380+INV-2024-042+9''\nDTM+137:202403160930:203''\nNAD+SU+FR001::9''\nNAD+BY+DE999::9''\nLIN+1++4012345678901:EN''\nQTY+47:50''\nMOA+86:1250.00''\nUNT+9+1''\nUNZ+2+2''', '{"reference":"INV-2024-042","amount":1250}'::jsonb, 'INV-2024-042', 'PROCESSED', now()),
--   (gen_random_uuid()::text, 'DESADV', 'INBOUND', 'DE999', 'FR001', 'UNB+UNOC:3+DE999:14+FR001:14+240317:0800+3''\nUNH+1+DESADV:D:96A:UN''\nBGM+351+DES-2024-012+9''\nDTM+137:202403170800:203''\nNAD+SU+DE999::9''\nNAD+ST+FR001::9''\nCPS+1''\nPAC+1''\nLIN+1++4012345678901:EN''\nQTY+12:200''\nUNT+10+1''\nUNZ+3+3''', '{"reference":"DES-2024-012","quantity":200}'::jsonb, 'DES-2024-012', 'RECEIVED', null),
--   (gen_random_uuid()::text, 'ORDERS', 'OUTBOUND', 'FR001', 'PARTENAIRE01', 'UNB+UNOC:3+FR001:14+PARTENAIRE01:14+240318:1000+4''\nUNH+1+ORDERS:D:96A:UN''\nBGM+220+ORD-2024-002+9''\nUNT+5+1''\nUNZ+4+4''', null, 'ORD-2024-002', 'RECEIVED', null);
