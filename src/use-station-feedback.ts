import {useEffect, useRef, useState} from 'react';

/** Each action gets a fresh display interval, including identical transfers. */
export function useStationFeedback() {
 const [message, setMessage] = useState('');
 const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
 useEffect(() => () => clearTimeout(timer.current), []);
 const show = (text: string) => {
  clearTimeout(timer.current);
  setMessage(text);
  if (text) timer.current = setTimeout(() => setMessage(''), 3200);
 };
 return [message, show] as const;
}
