// 門店主頁共用程式：學士店、昌平店各自的頁面呼叫 ERP.renderStore(店代碼)
// 門店頁給現場人員操作，不顯示成本與損益；損益在總部頁查看。
(function () {
'use strict';
ERP.renderStore = function (code) {
  var E = ERP;
  var L = E.loc(code);
  E.header({ code: code, title: L.name, sub: '現場作業：上傳報表、回報、收貨、盤點' });
  E.footer();
  E.$('#dayLabel').textContent = '示意日 ' + E.DAY;
  E.$('#posName').textContent = code === 'xueshi' ? 'Posky 普市集' : '肚肚 Dudoo';

  var stock = E.STORE_STOCK[code];
  var low = stock.filter(function (s) { return s.book < s.safe; });
  var toReceive = E.TRANSFERS.filter(function (t) { return t.to === code && t.status === '已出貨'; }).length +
    E.FACTORY.deliveries.filter(function (x) { return x.to === code && x.state !== '已送達'; }).length;
  var me = E.nextMonthEnd(), nd = new Date(me.getFullYear(), me.getMonth(), me.getDate() + 1);
  var md = (me.getMonth() + 1) + '/' + me.getDate(), nx = (nd.getMonth() + 1) + '/' + nd.getDate();
  var daysLeft = Math.ceil((me - new Date()) / 864e5);

  E.$('#figs').innerHTML =
    '<div class="fig"><dt>今日報表</dt><dd id="fig-up">未上傳</dd><span class="delta">收班後上傳</span></div>' +
    '<div class="fig"><dt>待收貨</dt><dd>' + toReceive + '<small>筆</small></dd><span class="delta">撥補與仙草凍</span></div>' +
    '<div class="fig"><dt>低於安全量</dt><dd>' + low.length + '<small>項</small></dd><span class="delta">' + (low.map(function (s) { return s.name; }).join('、') || '全部充足') + '</span></div>' +
    '<div class="fig"><dt>月底盤點</dt><dd>' + md + '</dd><span class="delta">還有 ' + daysLeft + ' 天</span></div>';

  // ── 上傳 ──
  var drop = E.$('#drop'), input = E.$('#posFile'), msg = E.$('#fileMsg');
  function took(f) {
    if (!f) return;
    msg.hidden = false;
    msg.textContent = '已選擇「' + f.name + '」（' + Math.ceil(f.size / 1024) + ' KB）。接上總部資料庫後會自動送出。';
    E.$('#fig-up').textContent = '已選取';
    E.toast('報表已選取');
  }
  input.addEventListener('change', function () { took(input.files[0]); });
  ['dragenter', 'dragover'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (e) { took(e.dataTransfer.files[0]); });

  // ── 收班回報：只輸入實際數字，不顯示系統值，由總部比對 ──
  var fields = [
    ['r-sales', 'POS 日結營業額', '元'],
    ['r-panda', '熊貓單數', '單'],
    ['r-pandaAmt', '熊貓金額', '元'],
    ['r-linepay', 'LINE Pay 金額', '元'],
    ['r-hours', '今日人員總時數', '小時'],
    ['r-kwh', '電表讀數', '度']
  ];
  E.$('#report').innerHTML = fields.map(function (f) {
    return '<div class="line"><label for="' + f[0] + '">' + f[1] + '</label>' +
      '<input id="' + f[0] + '" inputmode="decimal" placeholder="0"><span class="muted">' + f[2] + '</span></div>';
  }).join('') +
    '<div class="row" style="justify-content:flex-end;margin-top:6px"><button class="btn" type="button" id="sendReport">送出回報</button></div>';
  E.$('#sendReport').addEventListener('click', function () {
    var empty = fields.filter(function (f) { return E.$('#' + f[0]).value.trim() === ''; });
    if (empty.length) { E.toast('還有 ' + empty.length + ' 個欄位沒填：' + empty[0][1]); E.$('#' + empty[0][0]).focus(); return; }
    E.toast('已送出，總部會和 POS 報表比對（示意）');
  });

  // ── 庫存 ──
  E.$('#stock').innerHTML = stock.map(function (s) {
    var max = Math.max(s.safe * 2.2, s.book * 1.1);
    var state = s.book < s.safe ? 'bad' : (s.book < s.safe * 1.25 ? 'warn' : 'ok');
    var days = s.daily ? s.book / s.daily : 0;
    return '<div class="stock-item"><div class="spread"><b>' + s.name + '</b>' +
      E.chip(state, state === 'bad' ? '低於安全量' : state === 'warn' ? '接近安全量' : '充足') + '</div>' +
      '<div class="level"><div class="level-bar"><i class="' + (state === 'ok' ? '' : state) + '" style="width:' + Math.min(100, s.book / max * 100) + '%"></i>' +
      '<span class="safe" style="left:' + (s.safe / max * 100) + '%"></span></div>' +
      '<div class="level-meta"><span>帳面 ' + E.num(s.book, 1) + ' ' + s.unit + '・安全 ' + s.safe + '</span><span>約可用 ' + E.num(days, 1) + ' 天</span></div></div></div>';
  }).join('');

  // ── 到貨 ──
  var mine = E.TRANSFERS.filter(function (t) { return t.to === code && (t.status === '已出貨' || t.status === '建議' || t.status === '已審核'); });
  var cfMine = E.FACTORY.deliveries.filter(function (x) { return x.to === code; });
  var items = mine.map(function (t) {
    var act = t.status === '已出貨' ? '<button class="btn" type="button" data-no="' + t.no + '">確認收貨</button>'
      : t.status === '建議' ? '<button class="btn ghost" type="button" data-adj="' + t.no + '">確認數量</button>' : '<span class="muted">' + t.status + '</span>';
    return '<li><div class="main"><b>' + t.no + '</b><p>' + t.lines + ' 項・' + t.note + '</p></div><div class="end">' + act + '</div></li>';
  });
  cfMine.forEach(function (x) {
    items.push('<li><div class="main"><b>仙草凍 ' + x.kg + ' 公斤</b><p>中央工廠 ' + x.time + ' 出車</p></div><div class="end">' +
      (x.state === '已送達' ? E.chip('ok', '已送達') : '<button class="btn" type="button" data-cf="1">確認收貨</button>') + '</div></li>');
  });
  E.$('#inbound').innerHTML = items.join('') || '<li class="muted">目前沒有待收的貨</li>';
  E.$('#inbound').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.adj) { E.toast('撥補數量調整頁建置中'); return; }
    b.outerHTML = E.chip('ok', '已收貨');
    E.toast('已記錄收貨（示意）');
  });

  // ── 月底 ──
  E.$('#meList').innerHTML =
    '<li><span>' + md + ' 21:15</span><span>系統結算帳面庫存</span></li>' +
    '<li><span>' + md + ' 21:30</span><span>第一次盤點（閉店人員）</span></li>' +
    '<li><span>' + nx + ' 09:00</span><span>第二次盤點（開班人員）</span></li>';

  // ── 舊系統 ──
  var legacy = [
    ['checklist.html', '開收班 Checklist', '開班、收班步驟'],
    ['closing.html', '收班記錄', '營業數據與杯數'],
    ['temp.html', '溫度記錄', '冰箱各時段溫度'],
    ['jelly.html', '仙草凍記錄', '桶號與流程'],
    ['inventory.html', '盤補貨', '日常盤點與補貨'],
    ['stock.html', '進貨記錄', '進貨與支出'],
    ['elec.html', '電表記錄', '每日度數'],
    ['cleaning.html', '清潔管理', '每日、每週清潔']
  ];
  E.$('#legacy').innerHTML = legacy.map(function (l) {
    return '<a class="tile" href="' + E.legacyUrl(l[0], code) + '" target="_blank" rel="noopener"><span class="code">舊系統</span><b>' + l[1] + '</b><span>' + l[2] + '</span></a>';
  }).join('');
};
})();
