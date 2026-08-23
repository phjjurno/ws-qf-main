/* ============================================================
   wsQf 플레이리스트 — PULSE ORIGIN 추천 BGM
   형제 사이트(Shutress·mousekm)와 동일한 방식.
   재생 버튼/프리셋/랜덤/유튜브 링크 붙여넣기 지원, 곡 끝나면 다음 곡.
   ============================================================ */
(function () {
  'use strict';
  var YT_ORIGIN = 'https://www.youtube.com';

  var PULSE_TRACKS = [
    { id: '9E40d1donW4', label: '분위기 좋은 편집샵 재즈 힙합 🎷' },
    { id: 'N7XS4HasGk4', label: 'Late Night Jazz Hip Hop ☕' },
    { id: '-cZkpBoJ-1c', label: '마음이 조용해지는 인디 락' },
    { id: 'bAQlnYFfscE', label: 'Smooth R&B & Soul Mix' },
    { id: 'uVDR99PBFlg', label: '위험하게 분위기 좋은 둠칫 플리' },
    { id: 'G5PYccAFx3A', label: '걷다가 기분 좋아지는 도시팝 🚦' },
    { id: '4VZ6qgjB7jk', label: '연휴 필수 드라이브 팝 🚗' },
    { id: 'lH1YXw5oVk0', label: 'J-Rock for Late Night Drives' },
    { id: 'cMvrfbSdKwE', label: 'Stop Overthinking 🌙' },
    { id: 'AalYJfNXelk', label: '혼자 들으면 위험한 R&B 🔥' },
    { id: 'eUTnOGMh-v0', label: '위험하게 끌리는 Toxic R&B' }
  ];
  var MUSIC_POOL = [
    { id: 'jfKfPfyJRdk', label: 'lofi 집중 라디오 (라이브)' },
    { id: '5qap5aO4i9A', label: 'lofi hip hop radio' },
    { id: 'rUxyKA_-grg', label: '집중이 잘 되는 피아노' }
  ];

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s) { return document.querySelectorAll(s); };
  var rand = function (a) { return a[Math.floor(Math.random() * a.length)]; };
  var frame, input, errorEl, started = false, lastAdvance = 0;

  function parseYouTube(url) {
    try {
      var u = new URL(String(url).trim());
      if (!/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(u.hostname)) return null;
      var list = u.searchParams.get('list');
      if (list) return { type: 'list', id: list };
      if (u.hostname.indexOf('youtu.be') >= 0) return { type: 'video', id: u.pathname.slice(1).split('/')[0] };
      if (u.pathname === '/watch') return { type: 'video', id: u.searchParams.get('v') };
      var m = u.pathname.match(/^\/(embed|shorts|live)\/([\w-]{6,})/);
      if (m) return { type: 'video', id: m[2] };
    } catch (e) { /* URL 아님 */ }
    return null;
  }
  function ytSrc(id, autoplay) {
    var origin = encodeURIComponent(window.location.origin);
    return YT_ORIGIN + '/embed/' + id + '?rel=0&enablejsapi=1&origin=' + origin + (autoplay ? '&autoplay=1' : '');
  }
  function ytRegister() {
    try {
      frame.contentWindow.postMessage(
        JSON.stringify({ event: 'listening', id: 'wsqf-yt', channel: 'widget' }), YT_ORIGIN);
    } catch (e) { /* 로드 전 */ }
  }
  function markActiveChip(id) {
    $$('.pl-preset').forEach(function (p) { p.classList.toggle('is-on', p.dataset.id === id); });
  }
  function playTrack(t, source) {
    frame.src = ytSrc(t.id, started);
    errorEl.hidden = true;
    $('#pl-now').innerHTML = '지금 재생 · <b>' + t.label + '</b>' +
      (source === 'pulse' ? ' <span class="pl-badge">PULSEORIGN</span>' : '');
    markActiveChip(t.id);
  }
  function shufflePlay() {
    var usePulse = Math.random() < 0.69;
    var pool = usePulse ? PULSE_TRACKS : MUSIC_POOL;
    started = true;
    playTrack(rand(pool), usePulse ? 'pulse' : 'pool');
  }
  function nextTrack() {
    var now = Date.now();
    if (now - lastAdvance < 3000) return;
    lastAdvance = now;
    var cur = frame.getAttribute('src') || '';
    var idx = -1, i;
    for (i = 0; i < PULSE_TRACKS.length; i++) { if (cur.indexOf(PULSE_TRACKS[i].id) >= 0) { idx = i; break; } }
    if (idx >= 0) playTrack(PULSE_TRACKS[(idx + 1) % PULSE_TRACKS.length], 'pulse');
    else shufflePlay();
  }
  function playCustom(url) {
    var parsed = parseYouTube(url);
    if (!parsed || !parsed.id) { errorEl.hidden = false; return false; }
    errorEl.hidden = true;
    started = true;
    var origin = encodeURIComponent(window.location.origin);
    frame.src = parsed.type === 'list'
      ? YT_ORIGIN + '/embed/videoseries?list=' + parsed.id + '&rel=0&autoplay=1&enablejsapi=1&origin=' + origin
      : ytSrc(parsed.id, true);
    $('#pl-now').innerHTML = '지금 재생 · <b>내가 붙여넣은 링크</b>';
    markActiveChip('');
    return true;
  }

  var musicIcon = '<svg class="pl-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
  function renderPresets() {
    var box = $('#pl-presets');
    if (!box) return;
    box.innerHTML = PULSE_TRACKS.map(function (t) {
      return '<button class="pl-preset" type="button" data-id="' + t.id + '">' + musicIcon + '<span>' + t.label + '</span></button>';
    }).join('');
    var cur = frame.getAttribute('src') || '';
    var on = PULSE_TRACKS.find(function (t) { return cur.indexOf(t.id) >= 0; });
    markActiveChip(on ? on.id : '');
  }

  function init() {
    frame = $('#pl-frame'); input = $('#pl-input'); errorEl = $('#pl-error');
    if (!frame) return;

    frame.addEventListener('load', function () { ytRegister(); setTimeout(ytRegister, 600); });
    window.addEventListener('message', function (e) {
      if (e.origin !== YT_ORIGIN) return;
      var d; try { d = JSON.parse(e.data); } catch (x) { return; }
      if (d.event === 'onReady' && frame.contentWindow) {
        frame.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'setVolume', args: [50] }), YT_ORIGIN);
      }
      var ps = d.event === 'onStateChange' ? d.info
        : (d.event === 'infoDelivery' && d.info && typeof d.info.playerState === 'number') ? d.info.playerState
        : null;
      if (ps === 0) nextTrack();
    });

    var playBtn = $('#pl-play'); if (playBtn) playBtn.addEventListener('click', function () { playCustom(input.value); });
    if (input) input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); playCustom(input.value); }
    });
    var shuf = $('#pl-shuffle'); if (shuf) shuf.addEventListener('click', function () { shufflePlay(); });
    document.addEventListener('click', function (e) {
      var chip = e.target.closest ? e.target.closest('.pl-preset') : null;
      if (!chip) return;
      var t = PULSE_TRACKS.find(function (x) { return x.id === chip.dataset.id; });
      if (t) { started = true; playTrack(t, 'pulse'); }
    });

    renderPresets();
    var first = rand(PULSE_TRACKS);
    frame.src = ytSrc(first.id, false);
    $('#pl-now').innerHTML = '<b>' + first.label + '</b> — 재생 버튼을 누르면 시작돼요';
    markActiveChip(first.id);

    /* 최신 PULSE ORIGIN 목록: Netlify 함수 → data json → 내장목록 순 폴백 */
    (function () {
      var sources = ['/.netlify/functions/pulse-tracks', 'data/pulse-tracks.json'];
      var tryNext = function (i) {
        if (i >= sources.length) return;
        fetch(sources[i], { cache: 'no-cache' }).then(function (res) {
          if (!res.ok) throw 0; return res.json();
        }).then(function (list) {
          var valid = Array.isArray(list) ? list.filter(function (t) {
            return t && typeof t.id === 'string' && typeof t.label === 'string';
          }) : [];
          if (valid.length >= 3) { PULSE_TRACKS = valid; renderPresets(); }
          else tryNext(i + 1);
        }).catch(function () { tryNext(i + 1); });
      };
      tryNext(0);
    })();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
