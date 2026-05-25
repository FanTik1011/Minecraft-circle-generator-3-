new ResizeObserver(()=>draw()).observe(cw);
setTimeout(()=>{ resetView(); draw(); }, 50);
