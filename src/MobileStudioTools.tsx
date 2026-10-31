import React, {type ReactNode} from 'react';
import {X} from 'lucide-react';

export type StudioToolTab = 'mode' | 'weather' | 'camera';
type Props = {
 playing: boolean;
 tab: StudioToolTab;
 onTab: (tab: StudioToolTab) => void;
 onClose: () => void;
 modeTools: ReactNode;
 weatherTools: ReactNode;
 cameraTools: ReactNode;
};

/** A workspace dock, never an overlay inside the playable screen. */
export default function MobileStudioTools({playing,tab,onTab,onClose,modeTools,weatherTools,cameraTools}:Props) {
 const tabs: {id:StudioToolTab;label:string}[] = [
  {id:'mode',label:playing?'Session':'Build'},
  {id:'weather',label:'Weather'},
  {id:'camera',label:'Camera'},
 ];
 return <aside id="studio-mobile-tools" className="studio-mobile-tools" aria-label="World tools">
  <div className="studio-mobile-dock-heading">
   <div className="studio-mobile-tool-tabs" role="tablist" aria-label="Tool groups" onKeyDown={e=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
    e.preventDefault();e.stopPropagation();
    const current=tabs.findIndex(t=>t.id===tab);
    const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(current+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
    onTab(tabs[next].id);
    e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
   }}>
    {tabs.map(t=><button key={t.id} id={`studio-tool-tab-${t.id}`} role="tab" aria-selected={tab===t.id} tabIndex={tab===t.id?0:-1} aria-controls={`studio-tool-panel-${t.id}`} onClick={()=>onTab(t.id)}>{t.label}</button>)}
   </div>
   <button className="studio-dock-close" aria-label="Collapse tools" onClick={onClose}><X size={18}/></button>
  </div>
  <div className={`studio-mobile-tool-content studio-mobile-tool-${tab}`} role="tabpanel" id={`studio-tool-panel-${tab}`} aria-labelledby={`studio-tool-tab-${tab}`} tabIndex={0}>
   {tab==='mode'?modeTools:tab==='weather'?weatherTools:cameraTools}
  </div>
 </aside>;
}
