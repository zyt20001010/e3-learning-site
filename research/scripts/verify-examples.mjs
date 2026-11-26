import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('..',import.meta.url));
const content=path.join(root,'content','lessons'),examples=path.join(root,'examples');
await mkdir(examples,{recursive:true});
const results=[];
for(const file of (await readdir(content)).filter(f=>f.endsWith('.json')).sort()){
  const full=path.join(content,file),lesson=JSON.parse(await readFile(full,'utf8'));
  let valid=true,found=false;
  for(const section of lesson.sections){
    const code=section.code;if(!code)continue;found=true;
    const extension=code.language==='r'?'R':code.language==='python'?'py':null;
    if(!extension)throw new Error('Unsupported language in '+lesson.id);
    const filename=lesson.id+'.'+extension,source=path.join(examples,filename);
    await writeFile(source,code.source);
    const executable=extension==='R'?'Rscript':'python3',args=extension==='R'?['--vanilla',source]:[source];
    const run=spawnSync(executable,args,{encoding:'utf8',cwd:examples,timeout:60000,maxBuffer:2*1024*1024});
    const version=spawnSync(executable,['--version'],{encoding:'utf8'});
    const ok=run.status===0&&!run.error;valid&&=ok;
    code.verified=ok;code.file=filename;
    results.push({id:lesson.id,section:section.id,file:filename,language:code.language,sha256:createHash('sha256').update(code.source).digest('hex'),exitCode:run.status,ok,environment:(version.stdout||version.stderr).trim(),stdout:run.stdout,stderr:run.stderr,error:run.error?.message||''});
    console.log((ok?'PASS ':'FAIL ')+lesson.id+' '+filename);
  }
  lesson.status.code=found&&valid;
  await writeFile(full,JSON.stringify(lesson,null,2)+'\n');
}
await writeFile(path.join(root,'content','code-run-report.json'),JSON.stringify({checkedOn:'2026-11-26',results},null,2)+'\n');
if(results.some(r=>!r.ok))process.exitCode=1;
