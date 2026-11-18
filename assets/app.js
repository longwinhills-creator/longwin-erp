// ══════════════════════════════════════════════════
// 瀧飲山丘 ERP｜共用資料層與元件
//
// 目前所有數字都是「示意數據」(DEMO = true)。
// 之後接上總部 Apps Script 時，只要把 ERP.api() 改成呼叫部署網址，
// 各主頁的畫面程式不需要改。
// ══════════════════════════════════════════════════
(function (global) {
  'use strict';

  var DEMO = true;
  var LEGACY_BASE = 'https://galaxyfoeytk.github.io/tailong-store/';

  // ── 據點主檔 ────────────────────────────────────
  var LOCS = [
    { code: 'hq',        name: '總部',     seal: '總', href: 'hq.html',                    role: '主檔、參數、審核、報表的中心' },
    { code: 'wh',        name: '總部倉庫', seal: '倉', href: 'warehouse.html',             role: '原物料庫存與撥補出貨' },
    { code: 'cf',        name: '中央工廠', seal: '坊', href: 'factory.html',               role: '仙草凍煮製、配送與成本' },
    { code: 'xueshi',    name: '學士店',   seal: '學', href: 'xueshi.html',    role: '門店營運、上傳報表、收貨盤點' },
    { code: 'changping', name: '昌平店',   seal: '昌', href: 'changping.html', role: '門店營運、上傳報表、收貨盤點' }
  ];
  function loc(code) { for (var i = 0; i < LOCS.length; i++) if (LOCS[i].code === code) return LOCS[i]; return null; }

  // ── 參數（示意值，正式值由總部參數表提供，皆有生效日）──
  var PARAMS = {
    taxIncluded: true,
    taxRate: 0.05,
    pandaRate: 0.30,        // 熊貓抽成率（示意）
    linePayRate: 0.022,     // LINE Pay 手續費率（示意）
    wage: 200,              // 時薪（示意）
    employerBurden: 0.12,   // 雇主負擔比例（示意）
    kwhPrice: 4.6,          // 每度電單價（示意）
    daysInMonth: 31,
    fixedMonthly: {         // 每月固定費用（示意）
      xueshi:    { '房租': 42000, 'POS 月費': 1200, '網路': 999, '外送平台月費': 0, '保險': 1500, '設備攤提': 6000 },
      changping: { '房租': 48000, 'POS 月費': 1500, '網路': 999, '外送平台月費': 0, '保險': 1500, '設備攤提': 8000 }
    }
  };

  // ── 示意營運資料（單日）──────────────────────────
  var DAY = '10/27（二）';
  var STORE_DAY = {
    xueshi: {
      revenue: 18640, cups: 236, orders: 171, panda: 3920, linePay: 2860,
      hours: 26, kwh: 58,
      items: [
        { name: '仙草凍奶',     qty: 62, unitCost: 31.8 },
        { name: '原味仙草茶',   qty: 48, unitCost: 9.6 },
        { name: '芋香風凍',     qty: 34, unitCost: 26.2 },
        { name: '檸夏風凍',     qty: 29, unitCost: 22.4 },
        { name: '桂花風凍',     qty: 25, unitCost: 23.1 },
        { name: '其他品項',     qty: 38, unitCost: 18.5 }
      ],
      packPerCup: 6.2,
      manual: { revenue: 18640, panda: 1180, linePay: 63, hours: 26.5, food: null }
    },
    changping: {
      revenue: 13980, cups: 181, orders: 133, panda: 1650, linePay: 3410,
      hours: 22, kwh: 64,
      items: [
        { name: '仙草凍奶',     qty: 44, unitCost: 31.8 },
        { name: '原味仙草茶',   qty: 41, unitCost: 9.6 },
        { name: '芋香風凍',     qty: 27, unitCost: 26.2 },
        { name: '檸夏風凍',     qty: 21, unitCost: 22.4 },
        { name: '桂花風凍',     qty: 18, unitCost: 23.1 },
        { name: '其他品項',     qty: 30, unitCost: 18.5 }
      ],
      packPerCup: 6.2,
      manual: { revenue: 13950, panda: null, linePay: null, hours: 22, food: null }
    }
  };

  // 近 7 日營業額（示意）
  var WEEK = {
    labels: ['10/21', '10/22', '10/23', '10/24', '10/25', '10/26', '10/27'],
    xueshi:    [16220, 17480, 16950, 19830, 24410, 23160, 18640],
    changping: [ 9870, 11240, 11890, 13060, 17320, 16480, 13980]
  };

  // 損益計算：與設計書 M1 公式一致
  function pnl(code, d) {
    d = d || STORE_DAY[code];
    var P = PARAMS;
    var tax = P.taxIncluded ? d.revenue * P.taxRate / (1 + P.taxRate) : d.revenue * P.taxRate;
    var pandaFee = d.panda * P.pandaRate;
    var payFee = d.linePay * P.linePayRate;
    var net = d.revenue - tax - pandaFee - payFee;
    var food = d.items.reduce(function (s, it) { return s + it.qty * it.unitCost; }, 0);
    var pack = d.cups * d.packPerCup;
    var gross = net - food - pack;
    var labor = d.hours * P.wage * (1 + P.employerBurden);
    var elec = d.kwh * P.kwhPrice;
    var fm = P.fixedMonthly[code] || {};
    var fixedMonth = Object.keys(fm).reduce(function (s, k) { return s + fm[k]; }, 0);
    var fixed = fixedMonth / P.daysInMonth;
    var profit = gross - labor - elec - fixed;
    return {
      revenue: d.revenue, cups: d.cups, tax: tax, pandaFee: pandaFee, payFee: payFee, net: net,
      food: food, pack: pack, gross: gross, labor: labor, elec: elec, fixed: fixed, fixedMonth: fixedMonth,
      profit: profit, margin: d.revenue ? profit / d.revenue : 0,
      foodRate: d.revenue ? (food + pack) / d.revenue : 0,
      laborRate: d.revenue ? labor / d.revenue : 0,
      perCup: d.cups ? d.revenue / d.cups : 0
    };
  }

  // ── 倉庫（示意）─────────────────────────────────
  var WAREHOUSE = [
    { code: 'R01', name: '仙草乾',       cat: '原料', unit: '公斤', onHand: 86,  inTransit: 0,   safe: 60,  target: 180, daily: 7.2,  lead: 7,  supplier: '關西仙草行', moq: 30 },
    { code: 'R02', name: '二砂糖',       cat: '原料', unit: '公斤', onHand: 210, inTransit: 0,   safe: 80,  target: 250, daily: 9.5,  lead: 3,  supplier: '糖業經銷',   moq: 50 },
    { code: 'R03', name: '地瓜粉',       cat: '原料', unit: '公斤', onHand: 34,  inTransit: 25,  safe: 30,  target: 90,  daily: 3.1,  lead: 5,  supplier: '雜糧行',     moq: 25 },
    { code: 'R04', name: '芋頭餡',       cat: '原料', unit: '公斤', onHand: 18,  inTransit: 0,   safe: 20,  target: 60,  daily: 4.4,  lead: 4,  supplier: '大甲芋頭',   moq: 10 },
    { code: 'P01', name: '700cc 杯',     cat: '包材', unit: '條',   onHand: 64,  inTransit: 0,   safe: 30,  target: 120, daily: 4.2,  lead: 10, supplier: '包材行',     moq: 40 },
    { code: 'P02', name: '封口膜',       cat: '包材', unit: '捲',   onHand: 9,   inTransit: 0,   safe: 6,   target: 20,  daily: 0.6,  lead: 10, supplier: '包材行',     moq: 6 },
    { code: 'P03', name: '粗吸管',       cat: '包材', unit: '包',   onHand: 22,  inTransit: 30,  safe: 15,  target: 60,  daily: 2.3,  lead: 10, supplier: '包材行',     moq: 30 },
    { code: 'P04', name: '提袋',         cat: '包材', unit: '包',   onHand: 5,   inTransit: 0,   safe: 8,   target: 30,  daily: 1.1,  lead: 7,  supplier: '包材行',     moq: 20 }
  ];
  function whStatus(it) {
    var avail = it.onHand + it.inTransit;
    var reorderPoint = it.daily * it.lead + it.safe;
    var cover = it.daily ? it.onHand / it.daily : Infinity;
    var state = it.onHand < it.safe ? 'bad' : (avail <= reorderPoint ? 'warn' : 'ok');
    var suggest = 0;
    if (state !== 'ok') {
      suggest = Math.max(0, it.target - avail);
      suggest = Math.ceil(suggest / it.moq) * it.moq;
    }
    return { avail: avail, rop: reorderPoint, cover: cover, state: state, suggest: suggest };
  }

  // 撥補單（示意）
  var TRANSFERS = [
    { no: 'TR-1028-01', to: 'xueshi',    status: '建議',   lines: 7, note: '依 10/27 POS 耗用自動產生' },
    { no: 'TR-1028-02', to: 'changping', status: '建議',   lines: 5, note: '依 10/27 POS 耗用自動產生' },
    { no: 'TR-1027-02', to: 'changping', status: '已申請', lines: 6, note: '店長調高杯子 2 條' },
    { no: 'TR-1027-01', to: 'xueshi',    status: '已審核', lines: 8, note: '待倉庫出貨' },
    { no: 'TR-1026-01', to: 'xueshi',    status: '已出貨', lines: 6, note: '在途，待門店收貨' },
    { no: 'TR-1025-02', to: 'changping', status: '已收貨', lines: 5, note: '實收與出貨一致' }
  ];
  var TR_FLOW = ['建議', '已申請', '已審核', '已出貨', '已收貨'];

  // 門店庫存（示意）
  var STORE_STOCK = {
    xueshi: [
      { name: '原味仙草凍', unit: '公斤', book: 21.5, safe: 30, daily: 34.2 },
      { name: '鮮奶',       unit: '瓶',   book: 9,    safe: 8,  daily: 6.5 },
      { name: '700cc 杯',   unit: '條',   book: 2.5,  safe: 3,  daily: 4.6 },
      { name: '芋頭餡',     unit: '公斤', book: 3.8,  safe: 2,  daily: 2.4 },
      { name: '封口膜',     unit: '捲',   book: 1.2,  safe: 1,  daily: 0.4 }
    ],
    changping: [
      { name: '原味仙草凍', unit: '公斤', book: 26.0, safe: 24, daily: 25.1 },
      { name: '鮮奶',       unit: '瓶',   book: 5,    safe: 6,  daily: 4.8 },
      { name: '700cc 杯',   unit: '條',   book: 3.5,  safe: 3,  daily: 3.4 },
      { name: '芋頭餡',     unit: '公斤', book: 1.6,  safe: 2,  daily: 1.9 },
      { name: '封口膜',     unit: '捲',   book: 1.5,  safe: 1,  daily: 0.3 }
    ]
  };

  // 中央工廠（示意）
  var FACTORY = {
    gramsPerCup: 530,
    kgPerBatch: 40,           // 每桶產出（示意）
    stockKg: 58,
    readySoonKg: 40,
    shelfHours: 72,
    forecastCups: { xueshi: 68, changping: 49 },   // 未來 1 天仙草凍類杯數（示意）
    forecastDays: 2,
    safetyKg: 30,
    recipePerBatch: [                                // 工廠配方（待填，以下示意）
      { code: 'R01', name: '仙草乾',  qty: 2.4, unit: '公斤' },
      { code: 'R02', name: '二砂糖',  qty: 3.0, unit: '公斤' },
      { code: 'R03', name: '地瓜粉',  qty: 1.6, unit: '公斤' }
    ],
    batches: [
      { no: 'B1028-1', bucket: '3 號桶', kg: 40.6, cooked: '07:10', stage: '冷卻中', by: '工廠人員 A' },
      { no: 'B1027-2', bucket: '1 號桶', kg: 39.2, cooked: '昨 14:30', stage: '可配送', by: '工廠人員 A' },
      { no: 'B1027-1', bucket: '2 號桶', kg: 41.0, cooked: '昨 07:05', stage: '已配送', by: '工廠人員 B' }
    ],
    deliveries: [
      { to: 'xueshi',    kg: 36, time: '09:20', state: '已送達' },
      { to: 'changping', kg: 26, time: '10:05', state: '配送中' }
    ],
    waste: [ { kg: 2.8, reason: '凝固不完全', batch: 'B1026-2' } ],
    cost: { // 本月累計（示意）
      material: 18420, labor: 22176, elec: 3180, freight: 4200, vehicle: 2950, other: 3000, outputKg: 1460
    }
  };

  // ── 共用工具 ───────────────────────────────────
  function $(sel, root) { return (root || document).querySelector(sel); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n, opts) {
    opts = opts || {};
    var v = Math.round(n);
    var s = Math.abs(v).toLocaleString('zh-TW');
    return (v < 0 ? '−' : (opts.sign && v > 0 ? '＋' : '')) + (opts.bare ? '' : '$') + s;
  }
  function pct(n, d) { return (n * 100).toFixed(d == null ? 1 : d) + '%'; }
  function num(n, d) { return Number(n).toLocaleString('zh-TW', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function chip(state, text) {
    var mark = { ok: '安', warn: '警', bad: '急', idle: '待' }[state] || '·';
    return '<span class="chip ' + state + '" data-mark="' + mark + '">' + esc(text) + '</span>';
  }
  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2400);
  }
  function legacyUrl(page, store) { return LEGACY_BASE + page + (store ? '?store=' + store : ''); }

  // 下一次月底快照（每月最後一天 21:15）
  function nextMonthEnd(now) {
    now = now || new Date();
    var y = now.getFullYear(), m = now.getMonth();
    var t = new Date(y, m + 1, 0, 21, 15, 0);
    if (now > t) t = new Date(y, m + 2, 0, 21, 15, 0);
    return t;
  }

  // ── 匾額頁首 ───────────────────────────────────
  var MOUNTAIN =
    '<svg class="mtn" viewBox="0 0 1200 70" preserveAspectRatio="none" aria-hidden="true">' +
    '<path class="far" d="M0 70 L0 48 L90 30 L170 44 L260 18 L360 40 L440 26 L540 46 L640 20 L730 38 L820 24 L930 44 L1030 22 L1120 40 L1200 30 L1200 70 Z"/>' +
    '<path d="M0 70 L0 58 L120 44 L210 56 L320 38 L420 54 L520 42 L640 58 L760 40 L860 56 L980 44 L1080 58 L1200 46 L1200 70 Z"/>' +
    '</svg>';

  function header(opts) {
    var L = loc(opts.code) || { seal: opts.seal || '山', name: opts.title, role: opts.sub };
    var showNav = opts.code === 'hq' || !loc(opts.code);
    var nav = !showNav ? '' : LOCS.map(function (l) {
      var cur = l.code === opts.code ? ' aria-current="page"' : '';
      return '<a href="' + l.href + '"' + cur + '><span class="mini">' + l.seal + '</span>' + l.name + '</a>';
    }).join('');
    var html =
      '<header class="plaque">' + MOUNTAIN +
      '<div class="wrap inner">' +
        '<div class="topbar">' +
          (showNav ? '<a class="brand" href="index.html">' : '<span class="brand">') + '<b>瀧飲山丘</b><span>營運系統</span>' + (showNav ? '</a>' : '</span>') +
          (nav ? '<nav class="locnav" aria-label="切換據點">' + nav + '</nav>' : '') +
        '</div>' +
        '<div class="title-row">' +
          '<div class="seal" aria-hidden="true">' + L.seal + '</div>' +
          '<div><h1>' + esc(opts.title || L.name) + '</h1>' +
          '<p>' + esc(opts.sub || L.role) + (DEMO ? '<span class="demo-tag">示意數據</span>' : '') + '</p></div>' +
        '</div>' +
      '</div></header>';
    var mount = document.getElementById('plaque');
    if (mount) mount.outerHTML = html;
    document.title = (opts.title || L.name) + '｜瀧飲山丘';
  }

  function footer() {
    var f = document.getElementById('foot');
    if (!f) return;
    f.className = 'foot';
    f.innerHTML = '<div class="wrap spread"><span>瀧飲山丘企業股份有限公司・營運系統 v0.1</span>' +
      '<span>' + (DEMO ? '目前顯示示意數據，正式數字待接上總部資料庫' : '') + '</span></div>';
  }

  // ── 折線圖（兩條以內，含懸停十字線）──────────────
  function niceMax(v) {
    var p = Math.pow(10, Math.floor(Math.log10(v)));
    var n = v / p;
    var step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return step * p;
  }
  function lineChart(el, cfg) {
    var W = 640, H = 240, m = { t: 14, r: 64, b: 28, l: 52 };
    var iw = W - m.l - m.r, ih = H - m.t - m.b;
    var all = [];
    cfg.series.forEach(function (s) { all = all.concat(s.values); });
    var max = niceMax(Math.max.apply(null, all) * 1.08);
    var ticks = 4;
    var x = function (i) { return m.l + (cfg.labels.length === 1 ? iw / 2 : i * iw / (cfg.labels.length - 1)); };
    var y = function (v) { return m.t + ih - v / max * ih; };
    var g = '';
    for (var k = 0; k <= ticks; k++) {
      var tv = max / ticks * k, ty = y(tv);
      g += '<line class="grid-line" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + ty + '" y2="' + ty + '"/>';
      g += '<text class="axis-text" x="' + (m.l - 8) + '" y="' + (ty + 4) + '" text-anchor="end">' + (cfg.fmtAxis ? cfg.fmtAxis(tv) : tv) + '</text>';
    }
    cfg.labels.forEach(function (lb, i) {
      g += '<text class="axis-text" x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(lb) + '</text>';
    });
    var lines = '', ends = [];
    cfg.series.forEach(function (s) {
      var d = s.values.map(function (v, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join(' ');
      lines += '<path d="' + d + '" style="fill:none;stroke:' + s.color + ';stroke-width:2;stroke-linejoin:round;stroke-linecap:round"/>';
      var li = s.values.length - 1;
      lines += '<circle cx="' + x(li) + '" cy="' + y(s.values[li]) + '" r="4.5" style="fill:' + s.color + ';stroke:var(--paper-2);stroke-width:2"/>';
      ends.push({ y: y(s.values[li]), text: s.name + ' ' + (cfg.fmt ? cfg.fmt(s.values[li]) : s.values[li]) });
    });
    ends.sort(function (a, b) { return a.y - b.y; });
    for (var e = 1; e < ends.length; e++) if (ends[e].y - ends[e - 1].y < 14) ends[e].y = ends[e - 1].y + 14;
    ends.forEach(function (en) {
      lines += '<text class="end-label" x="' + (W - m.r + 8) + '" y="' + (en.y + 4) + '">' + esc(en.text.split(' ')[0]) + '</text>';
    });
    var legend = '<div class="legend">' + cfg.series.map(function (s) {
      return '<span><i style="background:' + s.color + '"></i>' + esc(s.name) + '</span>';
    }).join('') + '</div>';
    el.innerHTML = legend +
      '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(cfg.label || '') + '">' +
      g + lines + '<line class="hair" y1="' + m.t + '" y2="' + (m.t + ih) + '" x1="0" x2="0" visibility="hidden"/>' +
      '<rect x="' + m.l + '" y="' + m.t + '" width="' + iw + '" height="' + ih + '" style="fill:transparent"/></svg>' +
      '<div class="tip" hidden></div></div>';
    var svg = el.querySelector('svg'), hair = el.querySelector('.hair'), tip = el.querySelector('.tip'), box = el.querySelector('.chart');
    function show(evt) {
      var r = svg.getBoundingClientRect();
      var px = (evt.clientX - r.left) / r.width * W;
      var i = Math.round((px - m.l) / iw * (cfg.labels.length - 1));
      i = Math.max(0, Math.min(cfg.labels.length - 1, i));
      hair.setAttribute('x1', x(i)); hair.setAttribute('x2', x(i)); hair.setAttribute('visibility', 'visible');
      tip.innerHTML = '<b>' + esc(cfg.labels[i]) + '</b>' + cfg.series.map(function (s) {
        return '<div><span><i style="background:' + s.color + '"></i>' + esc(s.name) + '</span><span>' + (cfg.fmt ? cfg.fmt(s.values[i]) : s.values[i]) + '</span></div>';
      }).join('');
      tip.hidden = false;
      var left = x(i) / W * r.width + 12;
      if (left + 160 > r.width) left = x(i) / W * r.width - 172;
      tip.style.left = Math.max(0, left) + 'px'; tip.style.top = '30px';
    }
    function hide() { hair.setAttribute('visibility', 'hidden'); tip.hidden = true; }
    svg.addEventListener('pointermove', show);
    svg.addEventListener('pointerleave', hide);
    void box;
  }

  global.ERP = {
    DEMO: DEMO, LOCS: LOCS, loc: loc, PARAMS: PARAMS, DAY: DAY, STORE_DAY: STORE_DAY, WEEK: WEEK,
    WAREHOUSE: WAREHOUSE, whStatus: whStatus, TRANSFERS: TRANSFERS, TR_FLOW: TR_FLOW,
    STORE_STOCK: STORE_STOCK, FACTORY: FACTORY,
    pnl: pnl, $: $, esc: esc, money: money, pct: pct, num: num, chip: chip, toast: toast,
    legacyUrl: legacyUrl, nextMonthEnd: nextMonthEnd, header: header, footer: footer, lineChart: lineChart,
    // 之後改成：return fetch(API_URL + '?action=' + action ...).then(r => r.json())
    api: function (action) { return Promise.resolve({ ok: true, demo: true, action: action }); }
  };
})(window);
