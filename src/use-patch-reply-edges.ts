import {useCallback,useState} from 'react';

/** The edge shading changes only when a reply starts or stops extending past an edge. */
export function usePatchReplyEdges(){
 const [left,setLeft]=useState(false),[right,setRight]=useState(false);
 const measure=useCallback((offset:number,viewport:number,content:number)=>{
  setLeft(offset>1);
  setRight(content-viewport-offset>1);
 },[]);
 return {left,right,measure};
}
