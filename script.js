const API="https://nerkh.jahankhahan.shop/data/live.json";
const CACHE="arzem_rates_v4";
const META="arzem_rates_meta_v4";

const names={
 dollar:["دلار آمریکا","دلار","$"], euro:["یورو","یورو","€"], yuan:["یوان چین","یوان","¥"],
 aed:["درهم امارات","درهم","AED"], lira:["لیر ترکیه","لیر","₺"], pound:["پوند انگلیس","پوند","£"],
 afn:["افغانی","افغانی","AFN"], rub:["روبل روسیه","روبل","RUB"], inr:["روپیه هند","روپیه","INR"],
 sar:["ریال سعودی","ریال","SAR"], qar:["ریال قطر","ریال","QAR"], kwd:["دینار کویت","دینار","KWD"],
 omr:["ریال عمان","ریال","OMR"], iqd:["دینار عراق","دینار","IQD"], chf:["فرانک سوئیس","فرانک","CHF"],
 cad:["دلار کانادا","دلار کانادا","C$"], aud:["دلار استرالیا","دلار استرالیا","A$"], tether:["تتر","تتر","USDT"]
};

const $=s=>document.querySelector(s);
const fmt=n=>new Intl.NumberFormat("fa-IR",{maximumFractionDigits:2}).format(n);
const num=v=>Number(String(v).replace(/[,\s٬]/g,"").replace("٫",".").replace(/[^\d.]/g,""))||0;

Object.entries(names).forEach(([k,v])=>{
  const o=document.createElement("option");o.value=k;o.textContent=`${v[2]}  ${v[0]}`;
  $("#currency").appendChild(o);
});
$("#currency").value="euro";

function updateUnit(){
  const k=$("#currency").value;
  $("#unit").textContent=names[k][1];
  $("#formula").textContent=`مبلغ × نرخ ${names[k][1]} → درصد بازه → کوپن ${names[k][1]}`;
}

/*
  The old fixed 4000 value is intentionally NOT used.
  The current live rate determines the Toman value first.
*/
function percentFor(toman){
  if(toman < 3000000) return 5;
  if(toman < 10000000) return 10;
  if(toman < 20000000) return 20;
  return 30;
}

function calculate(){
  const key=$("#currency").value;
  const amount=num($("#amount").value);
  const rate=Number(window.rates?.[key]);

  if(!amount || !rate){
    $("#coupon").textContent="—";
    $("#percent").textContent="—";
    $("#tomans").textContent="—";
    $("#rate").textContent=rate?`${fmt(rate)} تومان`:"—";
    return;
  }

  const tomanValue=amount*rate;
  const percent=percentFor(tomanValue);
  const couponToman=tomanValue*percent/100;
  const couponCurrency=couponToman/rate;

  $("#tomans").textContent=`${fmt(tomanValue)} تومان`;
  $("#rate").textContent=`${fmt(rate)} تومان`;
  $("#percent").textContent=`${percent}٪`;
  $("#coupon").textContent=fmt(couponCurrency);
  $("#couponLabel").textContent=`کوپن ${names[key][1]}`;
}

function cacheGet(){
  try{
    return {
      rates:JSON.parse(localStorage.getItem(CACHE)||"null"),
      meta:JSON.parse(localStorage.getItem(META)||"null")
    };
  }catch(e){return {rates:null,meta:null}}
}

function applyRates(rates,meta,online){
  window.rates=rates;
  $("#status").textContent=online?"نرخ زنده":"آخرین نرخ ذخیره‌شده";

  const dot=$("#status").previousElementSibling;
  dot.style.background=online?"#69cf9a":"#d9a75e";
  dot.style.boxShadow=online?"0 0 10px #69cf9a":"0 0 10px #d9a75e";

  if(meta?.date&&meta?.time)
    $("#updated").textContent=`آخرین بروزرسانی: ${meta.date} - ${meta.time}`;

  calculate();
}

async function loadRates(){
  const cached=cacheGet();

  try{
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),7000);

    const response=await fetch(API,{cache:"no-store",signal:controller.signal});
    clearTimeout(timeout);

    if(!response.ok) throw new Error("HTTP");
    const data=await response.json();

    if(!data.rates || typeof data.rates!=="object")
      throw new Error("BAD_DATA");

    localStorage.setItem(CACHE,JSON.stringify(data.rates));
    localStorage.setItem(META,JSON.stringify({date:data.date,time:data.time}));

    applyRates(data.rates,{date:data.date,time:data.time},true);
  }catch(error){
    if(cached.rates){
      applyRates(cached.rates,cached.meta,false);
    }else{
      $("#status").textContent="نرخ در دسترس نیست";
      $("#couponLabel").textContent="هنوز نرخی برای محاسبه ذخیره نشده است";
      $("#updated").textContent="—";
    }
  }
}

$("#currency").addEventListener("change",()=>{updateUnit();calculate()});
$("#amount").addEventListener("input",calculate);
$("#calc").addEventListener("click",calculate);

updateUnit();
loadRates();
