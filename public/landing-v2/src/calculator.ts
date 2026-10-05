// Adapt MathTutor's real keyboard layout, state machine and pixel LCD to plain HTML.
import { layoutFor, NAV_KEYS, type CalcKey } from '../../../../MathTutor/apps/web/src/features/casio/calculator-layouts'
import { initialState, press } from '../../../../MathTutor/apps/web/src/features/casio/emulator/machine'
import { machineScene, machineText, spokenInput } from '../../../../MathTutor/apps/web/src/features/casio/emulator/scene'
import { keyFromKeyboard } from '../../../../MathTutor/apps/web/src/features/casio/emulator/keyboard'
import { renderScene } from '../../../../MathTutor/apps/web/src/features/casio/lcd/lcd-renderer'
import { lcdGeometry, specFor } from '../../../../MathTutor/apps/web/src/features/casio/lcd/lcd-spec'

const host = document.querySelector<HTMLElement>('#calculator-face')!
const layout = layoutFor('fx-580vnx')!
const spec = specFor('fx-580vnx')!
const escape = (s = '') => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;')
const names: Record<string, string> = { frac:'Phân số', sqrt:'Căn bậc hai', square:'Bình phương', power:'Lũy thừa', logbase:'Log cơ số', neg:'Dấu âm', dms:'Độ phút giây', inverse:'Nghịch đảo', integral:'Tích phân', sd:'Đổi phân số và thập phân', exp:'Nhân 10 mũ', mul:'Nhân', div:'Chia', add:'Cộng', sub:'Trừ', eq:'Bằng', lparen:'Mở ngoặc', rparen:'Đóng ngoặc', dot:'Dấu chấm', up:'Lên', down:'Xuống', left:'Trái', right:'Phải' }
function key(k: CalcKey, reserve: boolean) {
  return `<button type="button" class="calc-key is-${k.kind}" data-key="${k.id}" aria-label="${escape(names[k.id] || k.label)}"${['shift','alpha'].includes(k.id)?' aria-pressed="false"':''}>${reserve?`<span class="calc-key-extra" aria-hidden="true"><span class="calc-key-shift">${escape(k.shift)}</span><span class="calc-key-alpha">${escape(k.alpha)}</span></span>`:''}<span class="calc-key-cap" aria-hidden="true">${escape(k.label)}</span></button>`
}
const rows = (list: CalcKey[][]) => list.map(row => row.map(k => key(k,row.some(k=>k.shift||k.alpha))).join('')).join('')
const side = (list: CalcKey[][]) => list.map((row,i)=>row.map(k=>key(k,[...layout.navLeft[i],...layout.navRight[i]].some(k=>k.shift||k.alpha))).join('')).join('')
const arrows:Record<string,[number,number,string]>={up:[32,21,'16,3 29,16 3,16'],down:[32,21,'3,3 29,3 16,16'],left:[21,34,'3,16 16,3 16,29'],right:[21,34,'5,3 18,16 5,29']}
host.innerHTML=`<div class="calc-face is-interactive" data-model="fx-580vnx"><div class="calc-brand"><span class="calc-edition">HỌC LỰC</span><span>${layout.name}</span></div><div class="calc-lcd"><div class="pixel-lcd-frame"><canvas class="pixel-lcd" aria-hidden="true"></canvas></div></div><div class="calc-keys"><div class="calc-nav"><div class="calc-nav-side">${side(layout.navLeft)}</div><div class="calc-dpad">${NAV_KEYS.map(k=>{const[w,h,p]=arrows[k.id];return `<button type="button" class="calc-dpad-key is-${k.id}" data-key="${k.id}" aria-label="${names[k.id]}"><svg class="calc-dpad-shape" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polygon class="calc-dpad-base" points="${p}" transform="translate(0 2)"/><polygon class="calc-dpad-face" points="${p}"/></svg></button>`}).join('')}</div><div class="calc-nav-side">${side(layout.navRight)}</div></div><div class="calc-grid is-function">${rows(layout.functionRows)}</div><div class="calc-grid is-number">${rows(layout.numberRows)}</div></div><div class="calc-bottom-label">CÙNG CÚ TÌM LỜI GIẢI</div></div>`
const canvas = host.querySelector('canvas')!
const frame = host.querySelector<HTMLElement>('.pixel-lcd-frame')!
const output = document.querySelector<HTMLElement>('#calculator-output')!
const notice = document.querySelector<HTMLElement>('#calculator-notice')!
const next = document.querySelector<HTMLButtonElement>('#calculator-next')!
const guide = document.querySelector<HTMLElement>('#calculator-guide')!
let state = initialState()
const examples = [
  {title:'Một cuốn sách 80.000đ, giảm 25%. Còn bao nhiêu?',result:'60.000đ — giá sau khi giảm.',steps:[{text:'Nhập giá gốc của cuốn sách.',keys:['d8','d0','d0','d0','d0']},{text:'Nhân với phần giá còn lại: 1 − 25/100.',keys:['mul','lparen','d1','sub','d2','d5','div','d1','d0','d0','rparen']},{text:'Bấm dấu bằng để xem giá sau giảm.',keys:['eq']}]},
  {title:'Căn bậc hai của 144 bằng bao nhiêu?',result:'12 — vì 12 × 12 = 144.',steps:[{text:'Mở căn bậc hai và nhập 144.',keys:['sqrt','d1','d4','d4','right']},{text:'Bấm dấu bằng để kiểm tra.',keys:['eq']}]},
  {title:'Tính sin 30° ở chế độ góc Degree.',result:'1/2 — tương đương 0,5.',steps:[{text:'Nhập sin(30). Máy đang ở chế độ Degree.',keys:['sin','d3','d0','rparen']},{text:'Bấm dấu bằng để xem kết quả.',keys:['eq']}]}
]
let exampleIndex=0,step=0,guided=true
function draw() {
  const rendered=renderScene(spec,state.power?machineScene(state):null)
  const g=lcdGeometry(spec,frame.clientWidth,window.devicePixelRatio||1)
  canvas.width=g.width;canvas.height=g.height;canvas.style.width=`${g.cssWidth}px`;canvas.style.height=`${g.cssHeight}px`
  const ctx=canvas.getContext('2d')!
  ctx.clearRect(0,0,g.width,g.height);ctx.fillStyle='#1e345a'
  const paint=(grid:typeof rendered.matrix,xs:number[],ys:number[],top:number,gap:number,ghost:boolean)=>{for(let y=0;y<grid.height;y++)for(let x=0;x<grid.width;x++){const on=grid.data[y*grid.width+x]===1;if(!on&&!ghost)continue;ctx.globalAlpha=on?1:.055;ctx.fillRect(xs[x],top+ys[y],Math.max(1,xs[x+1]-xs[x]-gap),Math.max(1,ys[y+1]-ys[y]-gap))}}
  paint(rendered.strip,g.stripColumnEdges,g.stripRowEdges,0,0,false);paint(rendered.matrix,g.columnEdges,g.rowEdges,g.matrixTop,g.gap,true)
  const c=rendered.cursor
  if(c&&state.power){ctx.globalAlpha=1;const x=Math.min(c.x,g.columnEdges.length-2),end=Math.min(x+(c.width||1),g.columnEdges.length-1),bottom=Math.min(c.y+c.height,g.rowEdges.length-1);ctx.fillRect(g.columnEdges[x],g.matrixTop+g.rowEdges[c.y],g.columnEdges[end]-g.columnEdges[x],g.rowEdges[bottom]-g.rowEdges[c.y])}
  ctx.globalAlpha=1
  const text=machineText(state)
  output.textContent=!state.power?'Máy đang tắt':state.screen==='error'?`Lỗi ${state.error?.kind}`:state.screen==='menu'?'Menu: dùng phím mũi tên để chọn chế độ.':`${spokenInput(state)}${text.result?' = '+text.result:''}${text.lines.length?' '+text.lines.join(' · '):''}`||'Máy sẵn sàng.'
  output.dataset.input=text.input;output.dataset.result=text.result||''
  notice.textContent=state.notice||''
  host.querySelectorAll<HTMLElement>('[data-key]').forEach(b=>{const id=b.dataset.key!;const latched=(id==='shift'&&state.shift)||(id==='alpha'&&state.alpha);b.classList.toggle('is-latched',latched);if(['shift','alpha'].includes(id))b.setAttribute('aria-pressed',String(latched));b.classList.toggle('is-active',guided&&!!examples[exampleIndex].steps[step]?.keys.includes(id))})
}
function renderGuide(){
  const ex=examples[exampleIndex]
  document.querySelector('#calculator-question')!.textContent=guided?ex.title:'Tự khám phá cách bấm của bạn.'
  if(!guided){guide.textContent='Bấm trực tiếp trên máy hoặc dùng bàn phím.';next.innerHTML='Xem lại hướng dẫn <svg class="ui-icon" aria-hidden="true" focusable="false"><use href="#ui-rotate-ccw"/></svg>';return}
  const current=ex.steps[step]
  guide.innerHTML=current?`<span class="guide-count">Bước ${step+1}/${ex.steps.length}</span><p>${current.text}</p><div class="guide-keys" aria-label="Các phím cần bấm">${current.keys.map(id=>`<kbd>${escape([...layout.navLeft.flat(),...layout.navRight.flat(),...layout.functionRows.flat(),...layout.numberRows.flat(),...NAV_KEYS].find(k=>k.id===id)?.label||id)}</kbd>`).join('')}</div>`:`<span class="guide-count"><svg class="ui-icon" aria-hidden="true" focusable="false"><use href="#ui-check"/></svg> Hoàn thành</span><p>${ex.result}</p>`
  next.innerHTML=current?'Bấm bước này <svg class="ui-icon" aria-hidden="true" focusable="false"><use href="#ui-arrow-right"/></svg>':'Thử lại ví dụ <svg class="ui-icon" aria-hidden="true" focusable="false"><use href="#ui-rotate-ccw"/></svg>'
}
function selectExample(index:number){exampleIndex=index;step=0;guided=true;state=initialState();document.querySelectorAll('[data-calc-example]').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));renderGuide();draw()}
function manual(id:string){guided=false;document.querySelectorAll('[data-calc-example]').forEach(b=>b.setAttribute('aria-pressed','false'));state=press(state,id);renderGuide();draw()}
host.addEventListener('click',e=>{const button=(e.target as HTMLElement).closest<HTMLElement>('[data-key]');if(button)manual(button.dataset.key!)})
host.addEventListener('mousedown',e=>{if((e.target as HTMLElement).closest('button')){e.preventDefault();host.focus({preventScroll:true})}})
host.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&(e.target as HTMLElement).tagName==='BUTTON')return;const key=keyFromKeyboard(e);if(key){e.preventDefault();manual(key)}})
next.addEventListener('click',()=>{if(!guided||step>=examples[exampleIndex].steps.length){selectExample(exampleIndex);return}for(const id of examples[exampleIndex].steps[step].keys)state=press(state,id);step++;renderGuide();draw()})
document.querySelectorAll<HTMLElement>('[data-calc-example]').forEach(b=>b.addEventListener('click',()=>selectExample(Number(b.dataset.calcExample))))
document.querySelector('#calculator-reset')!.addEventListener('click',()=>{state=initialState();guided=false;document.querySelectorAll('[data-calc-example]').forEach(b=>b.setAttribute('aria-pressed','false'));renderGuide();draw();host.focus({preventScroll:true})})
new ResizeObserver(draw).observe(frame)
selectExample(0)
