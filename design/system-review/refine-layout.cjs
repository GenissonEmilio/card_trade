const fs=require('node:fs'),path=require('node:path'),postcss=require('postcss'),ts=require('typescript');
const root=path.resolve(__dirname,'../..');
function patch(file,entries){const p=path.join(root,file),css=postcss.parse(fs.readFileSync(p,'utf8'));for(const [selector,values]of entries){let found;css.walkRules(r=>{if(r.selector===selector&&r.parent.type==='root')found=r});if(!found){found=postcss.rule({selector});css.append(found)}for(const [prop,value]of Object.entries(values)){let decl=found.nodes.find(n=>n.type==='decl'&&n.prop===prop);const important=/!important/.test(value);const clean=value.replace(/\s*!important/g,'').trim();if(decl){decl.value=clean;decl.important=important||decl.important}else found.append({prop,value:clean,important})}}fs.writeFileSync(p,css.toString());}
patch('src/app/design-system.css',[
 ['.duelink-system :is(.ds-main,.modal) :is(input,select,textarea):not(:focus-visible)',{outline:'none'}],
 ['.duelink-system .ds-main :is(p,li,dt,dd,small,address)',{'overflow-wrap':'anywhere'}],
 ['.duelink-system .ds-main strong:not([data-currency])',{'overflow-wrap':'anywhere'}],
 ['.duelink-system .ds-main .trade-detail-layout',{'grid-template-columns':'minmax(0,350px) minmax(0,1fr)'}],
 ['.duelink-system .ds-main .trade-detail-layout>*',{'min-width':'0','max-width':'100%'}],
 ['.duelink-system .ds-main .selected-card>div',{'min-width':'0',flex:'1','overflow-wrap':'anywhere'}],
 ['.duelink-system .ds-main .selected-card>img',{'flex-shrink':'0'}],
 ['.duelink-system .ds-main .trade-party>a',{display:'block','min-width':'0','overflow-wrap':'anywhere'}],
 ['.duelink-system .ds-main .profile-hero>div, .duelink-system .ds-main .duelist-card',{'min-width':'0'}],
 ['.duelink-system .ds-main .trade-row p',{'overflow-wrap':'anywhere'}],
 ['.duelink-system.ds-interior',{overflow:'visible'}],
 ['.duelink-system .ds-main .ds-action-primary, .duelink-system .modal .ds-action-primary',{color:'var(--ds-ink)'}],
 ['.duelink-system .ds-main .ds-action-primary::before, .duelink-system .modal .ds-action-primary::before',{'background-image':"url('/brand/pixel/ribbon-primary.svg')"}],
 ['.duelink-system .ds-main .filter-tabs button',{display:'inline-flex','align-items':'center','justify-content':'center',gap:'8px'}],
 ['.duelink-system .ds-main .message.mine time',{color:'var(--ds-dark-muted)','font-size':'11px','line-height':'1.5',opacity:'1'}],
 ['.duelink-system .modal .card-detail .field-hint',{display:'block',margin:'16px 0 24px','overflow-wrap':'anywhere'}],
 ['.duelink-system .pixel-account',{'min-width':'0','flex-shrink':'1'}],
 ['.duelink-system .pixel-account>a:not(.pixel-ribbon)',{'min-width':'0','max-width':'135px',overflow:'hidden','text-overflow':'ellipsis','white-space':'nowrap'}],
 ['.duelink-system .pixel-menu-toggle',{'flex-shrink':'0'}],
 ['.duelink-system .pixel-legal',{'overflow-wrap':'anywhere'}],
 ['.duelink-system .pixel-legal>a',{'white-space':'normal','overflow-wrap':'anywhere'}],
]);
patch('src/components/marketplace.module.css',[
 ['.card h2, .section h2',{display:'flex','align-items':'center',gap:'8px'}],
 ['.summary>div>span',{flex:'1 1 40%','min-width':'70px','overflow-wrap':'anywhere'}],
 ['.summary>div>strong:not([data-currency])',{flex:'1 1 60%','min-width':'0','overflow-wrap':'anywhere'}],
 ['.summary strong[data-currency]',{'flex-shrink':'0','white-space':'nowrap','overflow-wrap':'normal'}],
 ['.seller',{'min-width':'0','overflow-wrap':'anywhere','white-space':'normal'}],
 ['.orderLayout>div, .orderLayout>aside, .orderLayout>.card',{'min-width':'0','max-width':'100%'}],
 ['.card',{'min-width':'0','overflow-wrap':'anywhere'}],
]);
const market=path.join(root,'src/components/marketplace.module.css');fs.writeFileSync(market,fs.readFileSync(market,'utf8').replace(/(\.orderLayout\s*\{\s*)grid-template-columns:\s*1fr;/g,'$1grid-template-columns: minmax(0, 1fr);'));
patch('src/components/admin.module.css',[
 ['.checkbox',{'flex-direction':'row !important','align-items':'flex-start'}],
 ['.audit summary>*',{'min-width':'0','max-width':'100%','overflow-wrap':'anywhere'}],
 ['.audit summary',{'min-width':'0'}],
]);
const systemFile=path.join(root,'src/app/design-system.css');let systemText=fs.readFileSync(systemFile,'utf8');if(!systemText.includes('/* Narrow exchange workspace */'))systemText+='\n/* Narrow exchange workspace */\n@media(max-width:1050px){.duelink-system .ds-main .trade-detail-layout{grid-template-columns:minmax(0,1fr)}}\n';fs.writeFileSync(systemFile,systemText);
for(const name of ['marketplace.tsx','marketplace-orders.tsx']){const file=path.join(root,'src/components',name);let text=fs.readFileSync(file,'utf8'),source=ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),edits=[];function visit(n){if(ts.isJsxElement(n)&&n.openingElement.tagName.getText(source)==='strong'&&n.children.some(c=>c.getText(source).includes('money('))&&!n.openingElement.attributes.properties.some(a=>a.name?.getText(source)==='data-currency'))edits.push(n.openingElement.tagName.end);ts.forEachChild(n,visit)}visit(source);for(const i of edits.sort((a,b)=>b-a))text=text.slice(0,i)+' data-currency'+text.slice(i);fs.writeFileSync(file,text)}
console.log('Refined responsive grids, long content, action variants, money and modal spacing.');
