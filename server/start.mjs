import app from './app.mjs';import {init,root} from '../database/db.mjs';import path from 'node:path';import fs from 'node:fs';import express from 'express';
await init();
if(process.env.NODE_ENV==='production'){app.use(express.static(path.join(root,'dist')));app.get('/{*splat}',(req,res)=>res.sendFile(path.join(root,'dist/index.html')));}
else{const {createServer}=await import('vite');const {default:react}=await import('@vitejs/plugin-react');const vite=await createServer({root,configFile:false,plugins:[react()],server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);}
const port=Number(process.env.PORT||4173);
app.listen(port,'127.0.0.1',()=>console.log('Website desa tersedia di http://localhost:'+port));
