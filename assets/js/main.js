/* ==========================================================================
   个人主页交互脚本
   --------------------------------------------------------------------------
   功能一览
   1. 移动端导航开合（含点击链接 / Esc / 点击外部自动关闭）
   2. 滚动时给页头加投影
   3. 滚动显现动画 + 技能进度条展开（IntersectionObserver）
   4. 导航当前区块高亮
   5. 深浅色主题切换（记忆到 localStorage）
   6. 一键复制（邮箱 / 微信号）
   7. 页脚年份自动更新
   一切交互均为渐进增强：即使脚本不执行，页面内容依然完整可读。
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ----------------------------------------------------------------------
     1. 移动端导航
     ---------------------------------------------------------------------- */
  var navToggle = document.getElementById('navToggle');
  var nav = document.getElementById('nav');

  function closeNav() {
    if (!nav || !navToggle) return;
    nav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', '打开导航菜单');
  }

  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      var willOpen = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', willOpen);
      navToggle.setAttribute('aria-expanded', String(willOpen));
      navToggle.setAttribute('aria-label', willOpen ? '关闭导航菜单' : '打开导航菜单');
    });

    // 点击导航链接后收起菜单
    $$('.nav-link', nav).forEach(function (link) {
      link.addEventListener('click', closeNav);
    });

    // 点击页面其它区域 / 按 Esc 收起
    document.addEventListener('click', function (e) {
      if (!nav.classList.contains('is-open')) return;
      if (nav.contains(e.target) || navToggle.contains(e.target)) return;
      closeNav();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });

    // 视口变大回到桌面端时重置状态
    window.addEventListener('resize', function () {
      if (window.innerWidth > 820) closeNav();
    });
  }

  /* ----------------------------------------------------------------------
     2. 页头滚动投影
     ---------------------------------------------------------------------- */
  var header = document.getElementById('siteHeader');
  function onScroll() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ----------------------------------------------------------------------
     3. 滚动显现 + 技能条
     ---------------------------------------------------------------------- */
  var revealItems = $$('.reveal');

  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target); // 只播放一次
        // 入场结束后清掉错峰延迟，否则会影响卡片 hover 等后续过渡的响应速度
        var delay = parseFloat(entry.target.style.transitionDelay) || 0;
        window.setTimeout(function () {
          entry.target.style.transitionDelay = '0ms';
        }, delay * 1000 + 800);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    revealItems.forEach(function (el, i) {
      // 同组元素错开出现，节奏更自然
      var delay = Math.min(i % 6, 5) * 60;
      el.style.transitionDelay = delay + 'ms';
      // 入场动画结束后清掉延迟，避免影响卡片 hover 等后续过渡
      el.addEventListener('transitionend', function () {
        el.style.transitionDelay = '0ms';
      }, { once: true });
      revealObserver.observe(el);
    });

    // 技能进度条：进入视口后再展开
    var bars = $$('.skill-bar');
    var barObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var card = entry.target.closest('.skill-card') || entry.target;
        card.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.2 });
    bars.forEach(function (bar) { barObserver.observe(bar); });
  } else {
    // 兼容旧浏览器：直接全部显示
    revealItems.forEach(function (el) { el.classList.add('is-visible'); });
    $$('.skill-card').forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ----------------------------------------------------------------------
     4. 导航区块高亮
     ---------------------------------------------------------------------- */
  var navLinks = $$('.nav-link');
  var sections = navLinks
    .map(function (link) { return document.querySelector(link.getAttribute('href')); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var spyObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = '#' + entry.target.id;
        navLinks.forEach(function (link) {
          link.classList.toggle('is-active', link.getAttribute('href') === id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (sec) { spyObserver.observe(sec); });
  }

  /* ----------------------------------------------------------------------
     5. 主题切换
     ---------------------------------------------------------------------- */
  var themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) { /* 忽略 */ }
    });
  }

  /* ----------------------------------------------------------------------
     6. 一键复制
     ---------------------------------------------------------------------- */
  var toast = document.getElementById('toast');
  var toastTimer = null;

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-show'); }, 1800);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    // 兼容 http 等非安全上下文
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy') ? resolve() : reject(new Error('copy failed'));
      } catch (err) {
        reject(err);
      } finally {
        document.body.removeChild(ta);
      }
    });
  }

  $$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      copyText(text).then(function () {
        showToast('已复制：' + text);
      }).catch(function () {
        showToast('复制失败，请手动选择文本');
      });
    });
  });

  /* ----------------------------------------------------------------------
     7. 页脚年份
     ---------------------------------------------------------------------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
