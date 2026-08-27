/** La prova che lo sblocco e' vivo: la prima corsa dello specchio schedulato. */
import { readFileSync } from 'node:fs'
const env={}
for (const l of readFileSync('.env.local','utf8').split('\n')){const m=l.match(/^([A-Z_]+)=(.*)$/);if(m)env[m[1]]=m[2].trim().replace(/^["']|["']$/g,'')}
const PROD=new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]
const q=async(sql)=>{const r=await fetch(`https://api.supabase.com/v1/projects/${PROD}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query:sql,read_only:true})});if(!r.ok)throw new Error((await r.text()).slice(0,300));return r.json()}
console.log('adesso:', (await q('select now() as t'))[0].t)
console.log('corse dopo lo sblocco (2026-08-27):')
console.log(JSON.stringify(await q(`select calendar_key, started_at, finished_at is null as morta_a_meta,
   state_snapshot is not null as porta_la_via_di_ritorno,
   jsonb_array_length(coalesce(state_snapshot->'decisions','[]'::jsonb)) as decisioni_catturate
 from production_import_run where started_at > '2026-08-27T00:00:00Z' order by started_at desc`), null, 1))
console.log('stato a rischio, adesso:')
console.log(JSON.stringify(await q(`select p.calendar_key,
   count(*) filter (where i.ticked_at is null and (i.ticked_by is not null or i.ticked_by_name is not null)) annullate
 from production_plan p left join production_checklist_item i on i.plan_id=p.id group by p.calendar_key order by 1`)))
