import { useEffect, useState, useRef } from "react";
import type { GameSnapshot } from "../types";
import type { SearchResult } from "./model";
export function useReasoning(snapshot:GameSnapshot,enabled:boolean){
  const [result,setResult]=useState<SearchResult|null>(null);
  const [status,setStatus]=useState<"idle"|"running"|"done"|"error">("idle");
  const [progress,setProgress]=useState({checked:0,unique:0});
  const [error,setError]=useState("");
  const [run,setRun]=useState({id:0,deep:false,meta:false});
  const request=useRef(0);
  useEffect(()=>{
    if(!enabled){setResult(null);setStatus("idle");setError("");return;}
    const id=++request.current;let worker:Worker|null=null;let active=true;
    setResult(null);setStatus("running");setProgress({checked:0,unique:0});setError("");
    const timer=setTimeout(()=>{
      try{
        worker=new Worker(new URL("./solver.worker.ts",import.meta.url),{type:"module"});
        worker.onmessage=(event:MessageEvent)=>{
          const data=event.data;if(!active||request.current!==id||data.request!==id)return;
          if(data.type==='progress')setProgress({checked:data.checked,unique:data.unique});
          else if(data.type==='result'){setResult(data.result as SearchResult);setStatus('done');worker?.terminate();}
          else {setResult(null);setError(String(data.message));setStatus('error');worker?.terminate();}
        };
        worker.onerror=(event)=>{if(!active||request.current!==id)return;setResult(null);setError(event.message||'推理処理でエラーが発生しました');setStatus('error');worker?.terminate();};
        worker.postMessage({snapshot,request:id,options:{attempts:run.deep?12000:1800,maxMillis:run.deep?12000:3500,beamWidth:run.deep?5:3,seed:71347+run.id*101,meta:run.meta}});
      }catch(e){setResult(null);setError(String(e));setStatus('error');worker?.terminate();}
    },350);
    return()=>{active=false;clearTimeout(timer);worker?.terminate();};
  },[snapshot,enabled,run]);
  return {result,status,progress,error,meta:run.meta,rerun:(deep=false)=>setRun(r=>({...r,id:r.id+1,deep})),setMeta:(meta:boolean)=>setRun(r=>({...r,id:r.id+1,meta}))};
}
