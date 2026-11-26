
    (function(){
      var finished=false; var watchdog;
      var video=document.getElementById('cras-boot-video');
      if(video){video.muted=true;if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){video.autoplay=false;video.pause();video.removeAttribute('autoplay');}else{var play=video.play();if(play&&play.catch)play.catch(function(){});}}
      function el(id){return document.getElementById(id);}
      window.__crasSplash={
        set:function(p,t){if(finished)return;if(el('splash-fill'))el('splash-fill').style.width=Math.max(0,Math.min(100,p))+'%';if(el('splash-pct'))el('splash-pct').textContent=Math.round(p)+'%';if(t&&el('splash-status'))el('splash-status').textContent=t;if(el('splash-error'))el('splash-error').hidden=true;},
        indeterminate:function(t){if(el('splash-status'))el('splash-status').textContent=t||'Conectando…';},
        error:function(msg,retry){if(finished)return;if(el('splash-error'))el('splash-error').hidden=false;if(el('splash-error-msg'))el('splash-error-msg').textContent=msg;if(el('splash-retry'))el('splash-retry').onclick=function(){window.__crasSplash.set(5,'Tentando novamente…');if(typeof retry==='function')retry();else window.location.reload();};},
        done:function(){finished=true;clearTimeout(watchdog);if(el('root'))el('root').classList.add('app-ready');if(el('app-splash'))el('app-splash').remove();window.dispatchEvent(new Event('cras-app-ready'));}
      };
      watchdog=setTimeout(function(){if(!finished)window.__crasSplash.error('O carregamento está demorando. Confira sua conexão e tente novamente.',function(){window.location.reload();});},25000);
    })();
    