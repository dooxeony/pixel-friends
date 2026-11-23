const $=s=>document.querySelector(s),state={page:'welcome',step:0,nick:'',selected:0,connected:false,custom:null,photo:null,zoom:1.4,offsetX:0,offsetY:0,tab:'home'};
const stored=(()=>{try{return JSON.parse(localStorage.getItem('littleMeetProfile'))}catch{return null}})();if(stored&&stored.nick&&stored.avatar){state.profile=stored;state.page='home'}
const names=['몽글 토끼','말랑 곰','복숭아 냥이','초록 개구리','졸린 병아리'];const palettes=[['#fff9dd','#f6bbcb','#503f48'],['#dcb58b','#f6d5b0','#58443a'],['#f9d8c9','#ef9cb1','#654a52'],['#a3d9a5','#d5efae','#365d4e'],['#ffe58e','#ffb787','#69533b']];
function drawSprite(c,i,size=32){const ctx=c.getContext('2d');c.width=c.height=size;ctx.imageSmoothingEnabled=false;const unit=size/32;const block=(x,y,w,h,col)=>{ctx.fillStyle=col;ctx.fillRect(Math.round(x*unit),Math.round(y*unit),Math.ceil(w*unit),Math.ceil(h*unit))};let [base,pink,ink]=palettes[i];block(0,0,32,32,['#cceef4','#f9e8d9','#fcecf2','#d8f0e5','#f9eac9'][i]);if(i===0){block(8,2,5,12,ink);block(19,2,5,12,ink);block(9,3,3,10,base);block(20,3,3,10,base);block(10,5,1,6,pink);block(21,5,1,6,pink)}else if(i===1){block(5,7,8,9,ink);block(19,7,8,9,ink);block(7,9,5,6,base);block(20,9,5,6,base)}else if(i===2){block(5,4,10,13,ink);block(18,4,9,13,ink);block(7,6,7,9,base);block(20,6,5,9,base)}else if(i===3){block(6,6,8,8,ink);block(19,6,8,8,ink);block(8,7,5,5,'#fff');block(21,7,5,5,'#fff')}else{block(13,2,6,8,pink);block(17,4,6,6,pink)}
block(6,11,20,16,ink);block(4,15,24,11,ink);block(7,12,18,14,base);block(5,16,22,9,base);block(8,26,6,3,ink);block(18,26,6,3,ink);block(9,26,4,2,base);block(19,26,4,2,base);block(9,19,4,2,pink);block(20,19,4,2,pink);block(11,17,3,2,ink);block(19,17,3,2,ink);block(15,21,3,2,ink);if(i===4){block(15,20,4,3,'#f2a05c')}if(i===3){block(9,12,4,2,ink);block(20,12,4,2,ink)} }
function renderAvatar(c,avatar){if(avatar.type==='custom'){const img=new Image();img.onload=()=>{c.width=c.height=64;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(img,0,0,64,64)};img.src=avatar.data}else drawSprite(c,avatar.index)}
// Character art v2: preserves the original character indices and profile storage.
const newSpriteFiles=['rabbit','bear','cat','frog','chick'];
const newSpriteCache=newSpriteFiles.map(name=>{const img=new Image();img.src='./assets/characters/'+name+'.png';return img});
drawSprite=function(canvas,index,size=128){
  if(!canvas)return;
  const image=newSpriteCache[index];
  if(!image)return;
  const context=canvas.getContext('2d');
  canvas.width=canvas.height=size;
  context.imageSmoothingEnabled=false;
  const paint=()=>{if(!canvas.isConnected)return;context.clearRect(0,0,size,size);context.drawImage(image,0,0,size,size)};
  if(image.complete&&image.naturalWidth)paint();else image.addEventListener('load',paint,{once:true});
};
function avatarHTML(avatar,cls=''){return `<canvas class="${cls}" data-avatar='${JSON.stringify(avatar)}'></canvas>`}
function hydrate(){document.querySelectorAll('canvas[data-avatar]').forEach(c=>renderAvatar(c,JSON.parse(c.dataset.avatar)))}
function progress(n){return `<div class="progress">${[0,1,2].map(i=>`<span class="${i<=n?'on':''}"></span>`).join('')}</div>`}
function shell(content,nav=false){$('#app').innerHTML=`<header class="top"><div class="logo">우리<i>,</i> 만났어<span style="color:#f3a9ba">!</span></div><div class="tag">PIXEL FRIENDS ♡</div></header><div class="content">${content}</div>${nav?`<nav class="nav">${[['home','⌂','홈'],['friends','♡','친구'],['meet','▤','만남'],['my','☺','마이']].map(([id,ic,label])=>`<button data-tab="${id}" class="${state.tab===id?'active':''}"><span class="symbol">${ic}</span>${label}</button>`).join('')}</nav>`:''}`;hydrate();document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;render()})}
function render(){if(state.page==='welcome')return shell(`<div class="step">HELLO, NEW FRIEND!</div><h1 class="title">작은 화면 속에서<br>우리, 만나볼까? ♡</h1><p class="muted">나만의 픽셀 캐릭터를 만들고<br>우연히 마주친 친구들을 기록해요.</p><div class="heroArt"><div class="device"><div class="screen"><canvas id="welcomeAvatar"></canvas></div><div class="knob"></div></div></div><button class="primary" id="start">시작하기 &nbsp;→</button><div class="footerNote">NU40-DK와 함께하는 작은 만남 프로젝트</div>`),drawSprite($('#welcomeAvatar'),0),$('#start').onclick=()=>{state.page='connect';render()};
if(state.page==='connect')return shell(`${progress(0)}<div class="step">STEP 01 · DEVICE</div><h1 class="title">먼저, 우리 기기를<br>연결해 볼까? 📡</h1><p class="muted">NU40-DK 전원을 켜고 가까이 두세요.</p><div class="connectCard"><div class="ico">${state.connected?'💗':'📟'}</div><b>${state.connected?'체험용 기기 연결 완료!':'NU40-DK 찾는 중...'}</b><div class="muted">${state.connected?'화면 흐름을 확인할 수 있어요.':'실제 BLE 등록은 펌웨어 연동 후 사용할 수 있어요.'}</div></div><div class="notice">현재는 UI 체험 버전이에요. 실제 기기 검색, 버튼 소유 인증, 서버 등록은 아직 연결되지 않았어요.</div><div class="stack"><button class="primary" id="connect">${state.connected?'닉네임 정하러 가기 →':'체험 모드로 연결하기 →'}</button><button class="secondary" id="back">이전으로</button></div>`),$('#connect').onclick=()=>{if(state.connected)state.page='nickname';else state.connected=true;render()},$('#back').onclick=()=>{state.page='welcome';render()};
if(state.page==='nickname'){shell(`${progress(1)}<button class="back" id="back">← 이전으로</button><div class="step">STEP 02 · NICKNAME</div><h1 class="title">어떻게 불러줄까? ✨</h1><p class="muted">친구들 화면에 나타날 이름을 정해줘!</p><label class="field" for="nick">나의 닉네임</label><input id="nick" class="input" maxlength="10" autocomplete="off" placeholder="예: 말랑주영" value="${esc(state.nick)}"><div class="count" id="counter">2~10자 · 한글, 영문, 숫자</div><div style="height:65px"></div><button class="primary" id="next" disabled>다음으로 →</button>`);const inp=$('#nick'),next=$('#next');const check=()=>{state.nick=inp.value;const ok=/^[가-힣a-zA-Z0-9]{2,10}$/.test(state.nick);next.disabled=!ok;$('#counter').textContent=ok?'사용할 수 있는 닉네임이에요 ♡':'2~10자 · 한글, 영문, 숫자만 사용할 수 있어요'};inp.oninput=check;check();next.onclick=()=>{state.page='character';render()};$('#back').onclick=()=>{state.page='connect';render()};return}
if(state.page==='character'){shell(`${progress(2)}<button class="back" id="back">← 이전으로</button><div class="step">STEP 03 · MY CHARACTER</div><h1 class="title">나를 닮은 친구를<br>골라줘! 🧸</h1><p class="muted">마음에 드는 기본 캐릭터를 선택하거나<br>사진 속 얼굴을 픽셀로 변환할 수 있어.</p><div class="avatarGrid">${names.map((name,i)=>`<button class="avatarChoice ${state.selected===i?'selected':''}" data-choice="${i}">${avatarHTML({type:'preset',index:i})}<span>${name}</span></button>`).join('')}<button class="avatarChoice ${state.selected==='custom'?'selected':''}" id="customChoice"><span class="uploadIcon">＋</span><span>내 사진으로</span></button></div><div class="uploadbox" id="uploadBox" style="display:${state.selected==='custom'?'block':'none'}"><label for="photo">📷 사진 불러오기</label><input type="file" id="photo" accept="image/*"><p class="muted" style="font-size:12px">얼굴이 잘 보이는 사진을 골라줘.<br>원형 화면에 맞게 직접 조절할 수 있어!</p><div class="editor ${state.photo?'visible':''}" id="editor"><canvas id="pixelPreview"></canvas><div class="sliders"><div><label>얼굴 크기 <span id="zoomVal"></span></label><input type="range" id="zoom" min="1" max="3.5" step="0.05" value="${state.zoom}"></div><div><label>좌우 위치</label><input type="range" id="posX" min="-1" max="1" step="0.02" value="${state.offsetX}"></div><div><label>상하 위치</label><input type="range" id="posY" min="-1" max="1" step="0.02" value="${state.offsetY}"></div></div><button class="secondary" id="makePixel">이 모습으로 픽셀 변환 ♡</button></div></div><div class="notice">사진을 자동으로 얼굴 인식하는 기능은 아직 없어요. 지금은 직접 얼굴 위치를 맞춰 픽셀화하는 방식이에요.</div><button class="primary" id="next" ${state.selected==='custom'&&!state.custom?'disabled':''}>캐릭터 미리보기 →</button>`);document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{state.selected=Number(b.dataset.choice);render()});$('#customChoice').onclick=()=>{state.selected='custom';render()};$('#back').onclick=()=>{state.page='nickname';render()};$('#next').onclick=()=>{state.page='confirm';render()};const input=$('#photo');if(input)input.onchange=e=>{const file=e.target.files[0];if(!file)return;if(!file.type.startsWith('image/'))return alert('이미지 파일을 골라줘!');if(file.size>12*1024*1024)return alert('12MB 이하 이미지를 골라줘!');const reader=new FileReader;reader.onload=()=>{const img=new Image;img.onload=()=>{state.photo=img;state.custom=null;$('#editor').classList.add('visible');updatePixel();$('#next').disabled=true};img.src=reader.result};reader.readAsDataURL(file)};if(state.photo){['zoom','posX','posY'].forEach(id=>$('#'+id).oninput=e=>{state[id==='zoom'?'zoom':id==='posX'?'offsetX':'offsetY']=Number(e.target.value);updatePixel()});$('#makePixel').onclick=()=>{updatePixel();state.custom={type:'custom',data:$('#pixelPreview').toDataURL('image/png')};$('#next').disabled=false;$('#makePixel').textContent='✓ 픽셀 캐릭터 완성!'}}return}
if(state.page==='confirm'){const avatar=state.selected==='custom'?state.custom:{type:'preset',index:state.selected};shell(`<button class="back" id="back">← 다시 선택하기</button><div class="step">ALMOST THERE!</div><h1 class="title">짜잔! 이게 바로 너야 💖</h1><p class="muted">한번 확정하면 캐릭터는 바꿀 수 없어.<br>마음에 드는지 마지막으로 확인해 줘!</p><div class="previewCard">${avatarHTML(avatar,'bigAvatar')}<h2>${esc(state.nick)}</h2><div class="pill">나만의 픽셀 캐릭터</div></div><div class="warning">🔒 캐릭터는 최종 확정 후 변경할 수 없어요.</div><div class="stack"><button class="primary" id="finish">이 캐릭터로 확정하기 ♡</button><button class="secondary" id="back2">다시 고르기</button></div>`);$('#back').onclick=$('#back2').onclick=()=>{state.page='character';render()};$('#finish').onclick=()=>{if(!confirm('캐릭터를 확정할까요? 확정 후에는 이 웹에서 수정할 수 없어요.'))return;state.profile={nick:state.nick,avatar,createdAt:new Date().toISOString()};try{localStorage.setItem('littleMeetProfile',JSON.stringify(state.profile))}catch(e){alert('브라우저 저장 공간이 부족해요.')}state.page='home';render()};return}
if(state.page==='home'){const profile=state.profile,avatar=profile.avatar;let html='';if(state.tab==='home')html=`<div class="step">MY LITTLE WORLD</div><h1 class="title">안녕, ${esc(profile.nick)}! 👋</h1><p class="muted">오늘은 어떤 새로운 친구를 만나게 될까?</p><div class="homeHero">${avatarHTML(avatar)}<div><h2>너의 캐릭터가<br>기다리고 있어 ♡</h2><span class="pill">✨ 나의 첫 캐릭터</span></div></div><div class="stats"><div class="stat"><strong>0</strong><small>💕 등록한 친구</small></div><div class="stat"><strong>0</strong><small>📍 만남 기록</small></div></div><div class="sectionTitle">최근 만남</div><div class="empty"><span class="emoji">💌</span>아직 기록된 만남이 없어!<br>기기로 친구를 만나면 여기에 표시될 거야.</div>`;else if(state.tab==='friends')html=`<div class="step">MY FRIENDS</div><h1 class="title">나의 친구들 ♡</h1><p class="muted">기기 버튼으로 친구 추가한 친구들이 모일 곳이야.</p><div class="empty" style="margin-top:35px"><span class="emoji">🧸</span>아직 등록된 친구가 없어.<br>첫 친구를 만나보자!</div>`;else if(state.tab==='meet'){let meetings=[];try{meetings=JSON.parse(localStorage.getItem('littleMeetMeetings')||'[]')}catch{}html=`<div class="step">OUR MOMENTS</div><h1 class="title">우리가 만난 순간 📍</h1><p class="muted">서로 화면을 공유한 친구들이 기록돼.</p>${meetings.length?meetings.map(m=>`<div class="listRow meetingRow">${avatarHTML({type:'preset',index:Number(m.avatar)},'meetingAvatar')}<div><strong>${esc(m.nick)}</strong><small>${new Date(m.metAt).toLocaleString('ko-KR')}</small></div></div>`).join(''):`<div class="empty" style="margin-top:35px"><span class="emoji">🗓️</span>아직 만남 기록이 없어.<br>두 보드가 서로 화면을 공유하면 여기에 남아.</div>`}`}else html=`<div class="step">MY PROFILE</div><h1 class="title">나의 프로필 ☁️</h1><div class="previewCard">${avatarHTML(avatar,'bigAvatar')}<h2>${esc(profile.nick)}</h2><span class="pill">캐릭터 확정 완료</span></div><div class="listRow"><span class="symbol">📟</span><div><strong>NU40-DK 연결</strong><small>체험 모드 · 실제 보드 미등록</small></div></div><div class="listRow"><span class="symbol">🔒</span><div><strong>캐릭터 변경 불가</strong><small>최초 설정한 캐릭터를 유지해요</small></div></div><div class="footerNote">데이터는 이 브라우저에만 저장돼요.</div>`;return shell(html,true)} }
function updatePixel(){if(!state.photo||!$('#pixelPreview'))return;const canvas=$('#pixelPreview'),ctx=canvas.getContext('2d'),img=state.photo;canvas.width=canvas.height=64;ctx.imageSmoothingEnabled=true;ctx.fillStyle='#d9f1f2';ctx.fillRect(0,0,64,64);const base=Math.max(64/img.width,64/img.height),scale=base*state.zoom,w=img.width*scale,h=img.height*scale;ctx.drawImage(img,(64-w)/2+state.offsetX*30,(64-h)/2+state.offsetY*30,w,h);const data=ctx.getImageData(0,0,64,64);for(let i=0;i<data.data.length;i+=4){for(let j=0;j<3;j++){let v=data.data[i+j];data.data[i+j]=Math.min(255,Math.round(v/32)*32)}}ctx.putImageData(data,0,0);$('#zoomVal').textContent=state.zoom.toFixed(1)+'×';state.custom=null;if($('#next'))$('#next').disabled=true;if($('#makePixel'))$('#makePixel').textContent='이 모습으로 픽셀 변환 ♡'}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}render();



// Mobile-friendly photo positioning and editable avatars.
const originalRender=render;
render=function(){
  originalRender();
  if(state.page==='character'){
    const back=$('#back');
    if(back&&state.editing)back.onclick=()=>{state.page='home';state.tab='my';state.editing=false;render()};
    const preview=$('#pixelPreview');
    if(state.photo&&preview){
      updatePixel();
      if(state.custom){$('#next').disabled=false;$('#makePixel').textContent='✓ 픽셀 캐릭터 완성!'}
      let last=null;
      preview.style.touchAction='none';
      preview.style.cursor='grab';
      preview.addEventListener('pointerdown',e=>{last={x:e.clientX,y:e.clientY};preview.setPointerCapture(e.pointerId)});
      preview.addEventListener('pointermove',e=>{
        if(!last)return;
        const rect=preview.getBoundingClientRect();
        state.offsetX=Math.max(-1,Math.min(1,state.offsetX+(e.clientX-last.x)/rect.width*2));
        state.offsetY=Math.max(-1,Math.min(1,state.offsetY+(e.clientY-last.y)/rect.height*2));
        last={x:e.clientX,y:e.clientY};
        $('#posX').value=state.offsetX;$('#posY').value=state.offsetY;
        updatePixel();
      });
      preview.addEventListener('pointerup',()=>last=null);
      preview.addEventListener('pointercancel',()=>last=null);
    }
    if(state.selected==='custom'&&state.custom&&!state.photo){
      const holder=$('#uploadBox');
      const old=holder?.querySelector('.existingCustom');
      if(holder&&!old){
        const img=document.createElement('img');img.className='existingCustom';img.alt='현재 픽셀 캐릭터';img.src=state.custom.data;
        img.style.cssText='width:120px;height:120px;border-radius:50%;image-rendering:pixelated;display:block;margin:12px auto';
        holder.insertBefore(img,holder.querySelector('.editor'));
      }
    }
  }
  if(state.page==='confirm'){
    const desc=document.querySelector('.content>.muted');
    if(desc)desc.innerHTML='마음에 드는 모습인지 확인해 줘!<br>나중에 마이페이지에서 또 바꿀 수 있어.';
    const warn=$('.warning');if(warn)warn.textContent='🎨 캐릭터는 마이페이지에서 언제든 변경할 수 있어요.';
    const save=$('#finish');save.textContent=state.editing?'변경한 캐릭터 저장하기 ♡':'이 캐릭터로 시작하기 ♡';
    save.onclick=()=>{
      const avatar=state.selected==='custom'?state.custom:{type:'preset',index:state.selected};
      if(!avatar)return;
      state.profile=state.editing?{...state.profile,avatar}:{nick:state.nick,avatar,createdAt:new Date().toISOString()};
      try{localStorage.setItem('littleMeetProfile',JSON.stringify(state.profile))}catch(e){alert('저장 공간이 부족해서 캐릭터가 저장되지 않았어요.');return}
      state.editing=false;state.photo=null;state.page='home';state.tab='my';render();
    };
  }
  if(state.page==='home'){
    if(state.tab==='my'){
      const rows=document.querySelectorAll('.listRow');
      const lock=rows[1];if(lock){lock.querySelector('.symbol').textContent='🎨';lock.querySelector('strong').textContent='캐릭터 자유롭게 변경';lock.querySelector('small').textContent='언제든 다른 캐릭터로 바꿀 수 있어요';}
      const card=$('.previewCard');
      if(card){const b=document.createElement('button');b.className='primary';b.textContent='🎨 캐릭터 변경하기';b.style.marginTop='20px';b.onclick=()=>{
        state.editing=true;state.nick=state.profile.nick;state.photo=null;
        if(state.profile.avatar.type==='custom'){state.selected='custom';state.custom=state.profile.avatar}
        else{state.selected=state.profile.avatar.index;state.custom=null}
        state.page='character';render();
      };card.append(b)}
    }
  }
};
render();
