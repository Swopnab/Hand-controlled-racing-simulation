const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
exports.serve=async(root)=>{
    root=path.resolve(root);
    const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.mp4':'video/mp4'};
    const server=http.createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const target=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}res.setHeader('Content-Type',mime[path.extname(target)]||'application/octet-stream');res.end(await fs.readFile(target));}catch{res.writeHead(404).end();}});
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    return {url:`http://127.0.0.1:${server.address().port}`,close:()=>server.close()};
};
