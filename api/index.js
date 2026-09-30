import app from '../server/app.mjs';

export default function handler(req,res){
  // Vercel rewrites every API path to this function, including nested CMS routes.
  const routed=req.query?._route;
  if(typeof routed==='string'){
    const incoming=new URL(req.url,'http://localhost');
    incoming.searchParams.delete('_route');
    req.url='/api/'+routed.replace(/^\/+/, '')+incoming.search;
  }
  return app(req,res);
}
