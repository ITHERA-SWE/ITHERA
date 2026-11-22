import {pathToFileURL,fileURLToPath} from 'node:url'
import {dirname} from 'node:path'
const base=dirname(fileURLToPath(import.meta.url))
const {build}=await import(pathToFileURL(process.env.ITHERA_REPO_ROOT+'/frontend/node_modules/vite/dist/node/index.js').href)
import { writeFileSync } from 'node:fs'
const root=process.env.ITHERA_REPO_ROOT+'/frontend'
process.chdir(root)
const result=await build({root,configFile:root+'/vite.config.ts',logLevel:'error',plugins:[{name:'isolated-auth-validation',enforce:'pre',resolveId(id,importer){if(importer&&/\/lib\/supabase$/.test(id))return base+'/supabase-stub.ts'}}],define:{'process.env.NODE_ENV':JSON.stringify('production'),'import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY':JSON.stringify('fixture-only-no-secret'),'import.meta.env.VITE_API_URL':JSON.stringify('http://127.0.0.1:3009/api'),'import.meta.env.VITE_SUPABASE_URL':JSON.stringify('http://127.0.0.1:54321'),'import.meta.env.VITE_SUPABASE_ANON_KEY':JSON.stringify('test-only-no-secret')},build:{write:false,minify:false,lib:{entry:root+'/src/main.tsx',name:'ItheraIsolatedValidation',formats:['iife']}}})
for(const out of (Array.isArray(result)?result:[result]))for(const file of out.output)if(file.type==='chunk')writeFileSync(base+'/dom-bundle.js',file.code)
console.log('Bundle aislado de la aplicación generado')
