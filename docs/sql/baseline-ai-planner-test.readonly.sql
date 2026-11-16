BEGIN READ ONLY;
SELECT jsonb_build_object(
 'scope','public – aplikačná schéma; bez riadkov a managed Auth dát',
 'server_version',current_setting('server_version'),
 'schemas',(SELECT jsonb_agg(jsonb_build_object('name',nspname,'owner',pg_get_userbyid(nspowner),'acl',nspacl::text)) FROM pg_namespace WHERE nspname='public'),
 'extensions',(SELECT jsonb_agg(jsonb_build_object('name',extname,'version',extversion,'schema',n.nspname) ORDER BY extname) FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace),
 'relations',(SELECT jsonb_agg(jsonb_build_object('name',c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'acl',c.relacl::text,'options',c.reloptions,'comment',obj_description(c.oid,'pg_class')) ORDER BY c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S')),
 'columns',(SELECT jsonb_agg(jsonb_build_object('table',c.relname,'position',a.attnum,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid),'identity',a.attidentity,'generated',a.attgenerated,'acl',a.attacl::text,'comment',col_description(c.oid,a.attnum)) ORDER BY c.relname,a.attnum) FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m') AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT jsonb_agg(jsonb_build_object('table',c.relname,'name',co.conname,'type',co.contype,'validated',co.convalidated,'definition',pg_get_constraintdef(co.oid,true)) ORDER BY c.relname,co.conname) FROM pg_constraint co JOIN pg_class c ON c.oid=co.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'),
 'indexes',(SELECT jsonb_agg(jsonb_build_object('table',tablename,'name',indexname,'definition',indexdef) ORDER BY tablename,indexname) FROM pg_indexes WHERE schemaname='public'),
 'views',(SELECT jsonb_agg(jsonb_build_object('name',c.relname,'definition',pg_get_viewdef(c.oid,true)) ORDER BY c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('v','m')),
 'functions',(SELECT jsonb_agg(jsonb_build_object('name',p.proname,'identity',pg_get_function_identity_arguments(p.oid),'owner',pg_get_userbyid(p.proowner),'security_definer',p.prosecdef,'config',p.proconfig,'acl',p.proacl::text,'definition',pg_get_functiondef(p.oid)) ORDER BY p.proname,pg_get_function_identity_arguments(p.oid)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind IN ('f','p')),
 'triggers',(SELECT jsonb_agg(jsonb_build_object('table',c.relname,'name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid,true)) ORDER BY c.relname,t.tgname) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal),
 'policies',(SELECT jsonb_agg(to_jsonb(p) ORDER BY tablename,policyname) FROM pg_policies p WHERE schemaname='public'),
 'default_acl',(SELECT jsonb_agg(jsonb_build_object('owner',pg_get_userbyid(d.defaclrole),'schema',n.nspname,'kind',d.defaclobjtype,'acl',d.defaclacl::text) ORDER BY d.defaclrole,d.defaclnamespace,d.defaclobjtype) FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace WHERE n.nspname='public' OR d.defaclnamespace=0),
 'event_triggers',(SELECT jsonb_agg(jsonb_build_object('name',evtname,'event',evtevent,'owner',pg_get_userbyid(evtowner),'function',evtfoid::regprocedure::text,'enabled',evtenabled,'tags',evttags) ORDER BY evtname) FROM pg_event_trigger WHERE evtfoid IN (SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public')),
 'custom_types',(SELECT jsonb_agg(jsonb_build_object('name',t.typname,'kind',t.typtype)) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype IN ('e','d')),
 'sequences',(SELECT jsonb_agg(to_jsonb(s)) FROM pg_sequences s WHERE schemaname='public'),
 'external_reference',jsonb_build_object('table','auth.users','column','id','type','uuid'),
 'migration_registry',to_regclass('supabase_migrations.schema_migrations')::text
) AS baseline;
ROLLBACK;
