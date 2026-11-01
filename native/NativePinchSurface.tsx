import React from 'react';
import {GestureDetector,GestureStateManager,useManualGesture} from 'react-native-gesture-handler';
import {useSharedValue} from 'react-native-reanimated';
import type {NativePinchRegistration} from './use-native-play-zoom';

/** Only gameplay/map/movement surfaces are wrapped. Action buttons stay outside
 * these observers. IDs are namespaced per handler because RNGH recycles small
 * pointer indices independently in each recognizer. All grants/revocations run
 * on the UI touch stream, never from delayed React Native touch callbacks. */
function RegisteredSurface({registration,children}:{registration:NativePinchRegistration;children:React.ReactElement}){
 const {enabled,gesture:parent,registerSurface,unregisterSurface}=registration,ids=useSharedValue<string[]>([]);
 const gesture=useManualGesture({enabled,simultaneousWith:parent,cancelsTouchesInView:false,cancelsJSResponder:false,shouldCancelWhenOutside:false,
  onTouchesDown:e=>{'worklet';for(const touch of e.changedTouches){const id=e.handlerTag+':'+touch.id;if(!ids.value.includes(id))ids.value=[...ids.value,id];registerSurface(id,touch.absoluteX,touch.absoluteY)}},
  onTouchesUp:e=>{'worklet';for(const touch of e.changedTouches){const id=e.handlerTag+':'+touch.id;unregisterSurface(id);ids.value=ids.value.filter(value=>value!==id)}if(!e.numberOfTouches)GestureStateManager.deactivate(e.handlerTag)},
  onTouchesCancel:e=>{'worklet';for(const id of ids.value)unregisterSurface(id);ids.value=[];GestureStateManager.deactivate(e.handlerTag)},
 });
 return <GestureDetector gesture={gesture}>{children}</GestureDetector>;
}
export function NativePinchSurface({registration,children}:{registration?:NativePinchRegistration;children:React.ReactElement}){
 return registration?<RegisteredSurface registration={registration}>{children}</RegisteredSurface>:children;
}
