import HeadquartersPanel,{FurnaceRepairPanel} from './HeadquartersPanel';
import SmithyPanel from './SmithyPanel';
import FurnacePanel from './FurnacePanel';
import React from 'react';
import type {World} from './survival-engine';
import CampfirePanel from './CampfirePanel';
import ChestPanel from './ChestPanel';
import WarehousePanel from './WarehousePanel';
import './camp-station.css';
type Props={world:World;onClose:()=>void;onChange:()=>void};
export default function CampStationPanel(props:Props){return props.world.stationPanel==='headquarters'?<HeadquartersPanel {...props}/>:props.world.stationPanel==='furnace'&&props.world.progression&&!props.world.progression.furnaceRestored?<FurnaceRepairPanel {...props}/>:props.world.stationPanel==='smithy'?<SmithyPanel {...props}/>:props.world.stationPanel==='furnace'?<FurnacePanel {...props}/>:props.world.stationPanel==='warehouse'?<WarehousePanel {...props}/>:props.world.stationPanel==='fire'?<CampfirePanel {...props}/>:<ChestPanel {...props}/>}
