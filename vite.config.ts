import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({build:{outDir:'dist/client'},define:{global:'globalThis'},plugins:[react()],resolve:{alias:{'react-native':'react-native-web'}},server:{host:'0.0.0.0',allowedHosts:true}});
