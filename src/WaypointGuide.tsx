import React from 'react';
import {useWaypointNavigation} from './use-waypoint-navigation';
import type {World} from './survival-engine';
import {WAYPOINT_NEEDLE} from './waypoint';
import './waypoint.css';
export default function WaypointGuide({world}:{world:{current:World|null}}){
 const {angle}=useWaypointNavigation(world);
 return <svg className="kit-waypoint-needle" viewBox="-14 -14 28 28" style={{transform:`rotate(${angle}rad)`}} aria-hidden="true"><path d={WAYPOINT_NEEDLE} fill="#f4e6c7" stroke="#c6a56b" strokeWidth="1.3" strokeLinejoin="round"/><path d="M0 -9V5L-6 8Z" fill="#75998a"/></svg>;
}
