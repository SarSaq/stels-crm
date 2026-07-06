// Импортёр: выбирает 50 разнообразных заказов из data/orders.csv и генерирует seed.sql
// Заполняет: clients, materials, users, orders, order_stages.
// Даты «11 янв.» → timestamp 2026 года. Баг «Макетка→Сварочный цех» исправлен.

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..');
function parse(str){const rows=[];let f="",row=[],q=false;for(let i=0;i<str.length;i++){const c=str[i];if(q){if(c==='"'){if(str[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}else{if(c==='"')q=true;else if(c===','){row.push(f);f="";}else if(c==='\n'){row.push(f);rows.push(row);row=[];f="";}else if(c==='\r'){}else f+=c;}}if(f.length||row.length){row.push(f);rows.push(row);}return rows;}

const orders = parse(fs.readFileSync(path.join(DIR,'data/orders.csv'),'utf8'));
const data = orders.slice(1).filter(r=>r[1]&&r[1].trim()&&r[1].trim()!=='ч');

// --- отбор 50 разнообразных: все редкие статусы + примеры массовых ---
const byStatus={};
data.forEach(r=>{const s=(r[9]||'').trim()||'(пусто)';(byStatus[s]=byStatus[s]||[]).push(r);});
const plan={ 'Отгружено':12,'Готово':6,'Отмена':4,'В работе':6,'Ожидание':4,
  'В процессе':5,'Постпресс':4,'Проверка':3,'ОТК':2,'Монтаж':1,'Инженер':1,'Макетка':1 };
let picked=[];
for(const [st,n] of Object.entries(plan)){ const arr=byStatus[st]||[]; picked.push(...arr.slice(0,n)); }
picked = picked.slice(0,50);

// --- нормализация дат ---
const MONTHS={'янв':'01','фев':'02','мар':'03','апр':'04','май':'05','июн':'06','июл':'07','авг':'08','сен':'09','окт':'10','ноя':'11','дек':'12'};
function parseDate(s){ if(!s)return null; s=s.trim().replace(/\./g,''); const m=s.match(/(\d{1,2})\s*([а-я]+)/i); if(!m)return null; const day=m[1].padStart(2,'0'); const mon=MONTHS[m[2].slice(0,3).toLowerCase()]; if(!mon)return null; return `2026-${mon}-${day}`; }

// --- парсинг булевых/чисел ---
const TRUE=v=>String(v).trim().toUpperCase()==='TRUE';
function num(v){ if(v==null)return null; v=String(v).replace(',','.').replace(/[^\d.]/g,''); return v===''?null:parseFloat(v); }
function int(v){ const n=num(v); return n==null?null:Math.round(n); }

// --- карта этапов (индексы 0-based), баг Макетки исправлен ---
const STAGE_MAP=[
  {name:'Печать',    kind:'checkbox', checks:[22], status:23},
  {name:'Проварка',  kind:'checkbox', checks:[24], status:25},
  {name:'Ламинация', kind:'text',     checks:[26], status:27},
  {name:'Резка',     kind:'checkbox', checks:[28,29], status:30},
  {name:'Фрезер',    kind:'checkbox', checks:[31], status:32},
  {name:'Сварка',    kind:'checkbox', checks:[33], status:34},
  {name:'Макетка',   kind:'checkbox', checks:[35], status:36}, // было ошибочно 37
];
function stageActive(row,st){ if(st.kind==='text'){const v=(row[st.checks[0]]||'').trim(); return v!==''&&v.toUpperCase()!=='FALSE';} return st.checks.some(c=>TRUE(row[c])); }
function stageStatus(row,st){ const v=(row[st.status]||'').trim(); return v||null; }

// --- сбор справочников ТОЛЬКО из выбранных заказов ---
const clients=new Set(), materials=new Set(), managers=new Set();
picked.forEach(r=>{ if(r[1]?.trim())clients.add(r[1].trim()); if(r[14]?.trim())materials.add(r[14].trim()); if(r[2]?.trim())managers.add(r[2].trim()); });

// --- SQL-экранирование ---
const q=s=>s==null?'NULL':`'${String(s).replace(/'/g,"''")}'`;
const b=v=>v?'true':'false';

let sql=[];
sql.push('-- Stels CRM seed: 50 разнообразных заказов из Google Sheets');
sql.push('begin;');
sql.push('');
// справочники
sql.push('-- Клиенты');
[...clients].forEach(c=>sql.push(`insert into clients(name) values(${q(c)}) on conflict(name) do nothing;`));
sql.push('-- Материалы');
[...materials].forEach(m=>sql.push(`insert into materials(name) values(${q(m)}) on conflict(name) do nothing;`));
sql.push('-- Сотрудники (менеджеры)');
[...managers].forEach(m=>sql.push(`insert into users(full_name,role) select ${q(m)},'manager' where not exists(select 1 from users where full_name=${q(m)});`));
sql.push('');

// заказы
picked.forEach(r=>{
  const legacy=int(r[0]);
  const created=parseDate(r[3]);
  const due=parseDate(r[4]);
  const urgent = /сроч/i.test(r[5]||'');
  const fire = (r[5]||'').includes('🔥');
  const cols=['legacy_num','client_id','manager_id','status','description','source_link','quantity','width_mm','height_mm','material_id','material_available','print_method','print_equipment','sides','color','file_name','print_link','preview_url','is_urgent','is_fire','due_date','flag_scotch','flag_vyborka','flag_mount_film','tech_notes','created_at'];
  const vals=[
    legacy??'NULL',
    `(select id from clients where name=${q(r[1].trim())})`,
    r[2]?.trim()?`(select id from users where full_name=${q(r[2].trim())})`:'NULL',
    q((r[9]||'').trim()||'Ожидание'),
    q(r[7]||null),
    q(r[8]||null),
    int(r[10])??'NULL',
    int(r[11])??'NULL',
    int(r[12])??'NULL',
    r[14]?.trim()?`(select id from materials where name=${q(r[14].trim())})`:'NULL',
    r[15]?.trim()?b(/да/i.test(r[15])):'NULL',
    q(r[16]||null),
    q(r[16]||null), // print_equipment ~ способ печати в этих данных
    int(r[17])??'NULL',
    q(r[18]||null),
    q(r[19]||null),
    q(r[20]||null),
    q(r[21]||null),
    b(urgent), b(fire),
    due?`'${due}'`:'NULL',
    b(TRUE(r[39])), b(TRUE(r[40])), b(TRUE(r[41])),
    q(r[42]||null),
    created?`'${created} 12:00:00+00'`:'now()',
  ];
  sql.push(`insert into orders(${cols.join(',')}) values(${vals.join(',')});`);
  // этапы
  STAGE_MAP.forEach((st,idx)=>{
    if(!stageActive(r,st)) return;
    const status=stageStatus(r,st);
    const detail = st.kind==='text' ? (r[st.checks[0]]||'').trim() : null;
    sql.push(`insert into order_stages(order_id,stage_type_id,is_active,sequence,status,detail) `+
      `select currval(pg_get_serial_sequence('orders','id')),(select id from stage_types where name=${q(st.name)}),true,${(idx+1)*10},`+
      `${status?q(status):'NULL'},${detail?q(detail):'NULL'};`);
  });
});
sql.push('');
sql.push('commit;');

fs.writeFileSync(path.join(DIR,'scripts/seed.sql'), sql.join('\n'),'utf8');
console.log('seed.sql готов.');
console.log('Выбрано заказов:', picked.length);
console.log('Клиентов:', clients.size, '| Материалов:', materials.size, '| Менеджеров:', managers.size);
const cnt={}; picked.forEach(r=>{const s=(r[9]||'').trim();cnt[s]=(cnt[s]||0)+1;});
console.log('По статусам:', JSON.stringify(cnt,null,0));
