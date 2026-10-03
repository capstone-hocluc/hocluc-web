import { rolldown } from '../../../../MathTutor/apps/web/node_modules/rolldown/dist/index.mjs'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
const root=new URL('../',import.meta.url)
const bundle=await rolldown({input:fileURLToPath(new URL('./calculator.ts',import.meta.url))})
const {output}=await bundle.generate({format:'iife',minify:true})
if(output.length!==1||output[0].type!=='chunk')throw new Error('Expected one standalone calculator bundle')
const pagePath=new URL('index.html',root)
let page=await readFile(pagePath,'utf8')
const tag=`<script id="mathtutor-calculator">${output[0].code.replaceAll('</script','<\\/script')}</script>`
if(page.includes('<script id="mathtutor-calculator">'))page=page.replace(/<script id="mathtutor-calculator">[\s\S]*?<\/script>/,()=>tag)
else page=page.replace('</body>',tag+'\n</body>')
await writeFile(pagePath,page)
await bundle.close()
console.log(`Embedded MathTutor calculator: ${output[0].code.length} characters`)
