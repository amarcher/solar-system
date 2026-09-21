import { createContext, useContext } from 'react';
import { createFocusSpace } from './focusedSpace';
export const FocusedSpaceContext = createContext(createFocusSpace());
export const useFocusedSpace = () => useContext(FocusedSpaceContext);
