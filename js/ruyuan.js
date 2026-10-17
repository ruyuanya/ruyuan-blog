// 防抖全局计时器
let TT = null;    //time用来控制事件的触发
// 防抖函数:fn->逻辑 time->防抖时间
function debounce(fn, time) {
    if (TT !== null) clearTimeout(TT);
    TT = setTimeout(fn, time);
}

// 日历
const CountdownTimer = (() => {
    const config = {
        // ===== 倒数日节日（只改这里；年份每年自动计算，不用手改）=====
        mode: "gregorian",                  // gregorian=公历固定日期 | lunar=农历 | term=二十四节气
        targetName: "国庆节",
        targetMonth: 10,                    // 公历：月（1-12）
        targetDay: 1,                       // 公历：日
        targetLunar: { month: 8, day: 15 }, // 农历：如春节 {1,1}、元宵 {1,15}、端午 {5,5}、中秋 {8,15}、重阳 {9,9}
        targetTerm: 7,                      // 节气：1=小寒 … 7=清明 … 18=秋分 … 24=冬至
        units: {
            day: { text: "今日", unit: "小时" },
            week: { text: "本周", unit: "天" },
            month: { text: "本月", unit: "天" },
            year: { text: "本年", unit: "天" }
        }
    };

    const calculators = {
        day: () => {
            const hours = new Date().getHours();
            return {
                remaining: 24 - hours,
                percentage: (hours / 24) * 100
            };
        },
        week: () => {
            const day = new Date().getDay();
            const passed = day === 0 ? 6 : day - 1;
            return {
                remaining: 6 - passed,
                percentage: ((passed + 1) / 7) * 100
            };
        },
        month: () => {
            const now = new Date();
            const total = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const passed = now.getDate() - 1;
            return {
                remaining: total - passed,
                percentage: (passed / total) * 100
            };
        },
        year: () => {
            const now = new Date();
            const start = new Date(now.getFullYear(), 0, 1);
            const total = 365 + (now.getFullYear() % 4 === 0 ? 1 : 0);
            const passed = Math.floor((now - start) / 86400000);
            return {
                remaining: total - passed,
                percentage: (passed / total) * 100
            };
        }
    };

    // ---- 节日日期解析（公历 / 农历 / 节气，年份每年自动计算）----
    const midnight = d => { const t = new Date(d.getTime()); t.setHours(0, 0, 0, 0); return t; };
    const pad2 = n => (n < 10 ? '0' : '') + n;
    const fmtDate = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());

    // 某一年的节日对应的公历日期；配置无效时返回 null
    function festivalOfYear(year) {
        if (config.mode === 'lunar') {
            if (typeof calendarFormatter === 'undefined' || !calendarFormatter.lunar2solar) return null;
            try {
                const r = calendarFormatter.lunar2solar(year, config.targetLunar.month, config.targetLunar.day, false);
                if (r && r.cYear) return new Date(r.cYear, r.cMonth - 1, r.cDay);
            } catch (e) { /* 忽略，返回 null */ }
            return null;
        }
        if (config.mode === 'term') {
            if (typeof getTerm !== 'function') return null;
            const day = getTerm(year, config.targetTerm);
            return day > 0 ? new Date(year, Math.ceil(config.targetTerm / 2) - 1, day) : null;
        }
        const m = config.targetMonth, d = config.targetDay;
        const date = new Date(year, m - 1, d);
        if (date.getMonth() !== m - 1) date.setDate(0);    // 2-29 在平年回退到 2-28
        return date;
    }

    // 下一个节日（或今天）：今年已过则自动滚到明年
    function nextFestival(now) {
        const today = midnight(now);
        let date = festivalOfYear(today.getFullYear()) || festivalOfYear(today.getFullYear() + 1);
        if (!date) return null;
        if (today.getTime() > date.getTime()) {
            const next = festivalOfYear(date.getFullYear() + 1);
            if (next) date = next;
        }
        return {
            date: date,
            isToday: today.getTime() === date.getTime(),
            days: Math.round((midnight(date) - today) / 86400000)
        };
    }

    function updateCountdown() {
        const elements = ['cdText', 'eventName', 'eventDate', 'daysUntil', 'countRight']
            .map(id => document.getElementById(id));

        if (elements.some(el => !el)) return;

        const [cdText, eventName, eventDate, daysUntil, countRight] = elements;

        const fest = nextFestival(new Date());
        if (fest) {
            eventName.textContent = config.targetName;
            eventDate.textContent = fmtDate(fest.date);
            if (fest.isToday) {
                // 节日当天：小字改"今天"，大字改"就是今天！"
                cdText.textContent = '今天';
                daysUntil.textContent = '就是今天！';
                daysUntil.classList.add('cd-today-text');
            } else {
                cdText.textContent = '距离';
                daysUntil.textContent = fest.days;
                daysUntil.classList.remove('cd-today-text');
            }
        }

        countRight.innerHTML = Object.entries(config.units)
            .map(([key, { text, unit }]) => {
                const { remaining, percentage } = calculators[key]();
                return `
                    <div class="cd-count-item">
                        <div class="cd-item-name">${text}</div>
                        <div class="cd-item-progress">
                            <div class="cd-progress-bar" style="width: ${percentage}%; opacity: ${percentage / 100}"></div>
                            <span class="cd-percentage ${percentage >= 46 ? 'cd-many' : ''}">${percentage.toFixed(2)}%</span>
                            <span class="cd-remaining ${percentage >= 60 ? 'cd-many' : ''}">
                                <span class="cd-tip">还剩</span>${remaining}<span class="cd-tip">${unit}</span>
                            </span>
                        </div>
                    </div>
                `;
            }).join('');
    }

    function injectStyles() {
        const styles = `
            .card-countdown .item-content {
                display: flex;
            }
            .cd-count-left {
                position: relative;
                display: flex;
                flex-direction: column;
                margin-right: 0.8rem;
                line-height: 1.5;
                align-items: center;
                justify-content: center;
            }
            .cd-count-left .cd-text {
                font-size: 14px;
            }
            .cd-count-left .cd-name {
                font-weight: bold;
                font-size: 18px;
            }
            .cd-count-left .cd-time {
                font-size: 30px;
                font-weight: bold;
                color: var(--anzhiyu-main);
            }
            .cd-count-left .cd-date {
                font-size: 12px;
                opacity: 0.6;
            }
            .cd-count-left::after {
                content: "";
                position: absolute;
                right: -0.8rem;
                width: 2px;
                height: 80%;
                background-color: var(--anzhiyu-main);
                opacity: 0.5;
            }
            .cd-count-right {
                flex: 1;
                margin-left: .8rem;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
            }
            .cd-count-item {
                display: flex;
                flex-direction: row;
                align-items: center;
                height: 24px;
            }
            .cd-item-name {
                font-size: 14px;
                margin-right: 0.8rem;
                white-space: nowrap;
            }
            .cd-item-progress {
                position: relative;
                display: flex;
                flex-direction: row;
                align-items: center;
                justify-content: space-between;
                height: 100%;
                width: 100%;
                border-radius: 8px;
                background-color: var(--anzhiyu-background);
                overflow: hidden;
            }
            .cd-progress-bar {
                height: 100%;
                border-radius: 8px;
                background-color: var(--anzhiyu-main);
            }
            .cd-percentage,
            .cd-remaining {
                position: absolute;
                font-size: 12px;
                margin: 0 6px;
                transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
            }
            .cd-many {
                color: #fff;
            }
            .cd-remaining {
                opacity: 0;
                transform: translateX(10px);
            }
            .card-countdown .item-content:hover .cd-remaining {
                transform: translateX(0);
                opacity: 1;
            }
            .card-countdown .item-content:hover .cd-percentage {
                transform: translateX(-10px);
                opacity: 0;
            }
            .cd-count-left .cd-time.cd-today-text {
                font-size: 22px;
                letter-spacing: 2px;
            }
        `;

        const styleSheet = document.createElement("style");
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    let timer = null;
    let stylesInjected = false;
    const start = () => {
        if (!stylesInjected) { injectStyles(); stylesInjected = true; }
        if (timer) clearInterval(timer);                   // pjax 翻页防重复计时器
        updateCountdown();
        timer = setInterval(updateCountdown, 60000);       // 1 分钟：跨零点后尽快翻到"明年"
    };

    ['pjax:complete', 'DOMContentLoaded'].forEach(event => document.addEventListener(event, start));
    document.addEventListener('pjax:send', () => timer && clearInterval(timer));

    // 调试用：控制台改 RuyuanCountdown.config 换节日，RuyuanCountdown.update() 手动重绘
    window.RuyuanCountdown = { config: config, nextFestival: nextFestival, update: updateCountdown };

    return { start, stop: () => timer && clearInterval(timer) };
})();

//日历卡片样式
const RuyuanCalendar = (() => {
    const CONFIG = {
        calendarEl: 'aside-calendar',
        weekStart: 1,
        gridWeekStart: 0,
        weekCn: ['日', '一', '二', '三', '四', '五', '六'],
        tickMs: 60000,
        sun: { enable: true, lat: null, lng: null }
    };

    const pad2 = n => (n < 10 ? '0' : '') + n;
    const startOfDay = d => { const t = new Date(d.getTime()); t.setHours(0, 0, 0, 0); return t; };
    const daysInMonth = (y, m) => new Date(y, m, 0).getDate();          // m 为 1-12
    const isLeapYear = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    const daysInYear = y => isLeapYear(y) ? 366 : 365;
    const dayOfYear = d => Math.round((startOfDay(d) - new Date(d.getFullYear(), 0, 1)) / 86400000) + 1;

    // ISO 8601 周数（第几周）
    function isoWeek(d) {
        const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        t.setDate(t.getDate() - (t.getDay() + 6) % 7 + 3);          // 挪到当周周四
        const y = t.getFullYear();
        const jan4 = new Date(y, 0, 4);
        const week1Thu = new Date(y, 0, 4 - (jan4.getDay() + 6) % 7 + 3);
        return 1 + Math.round((t - week1Thu) / 604800000);
    }

    const weekdayCn = d => '周' + CONFIG.weekCn[d.getDay()];

    // 公历 → 农历（lunar.js 不在时返回 null，对应行自动隐藏）
    function getLunar(d) {
        if (typeof solar2lunar !== 'function') return null;
        try {
            const r = solar2lunar(d.getFullYear(), d.getMonth() + 1, d.getDate());
            return r && r.IMonthCn ? r : null;
        } catch (e) { return null; }
    }

    // 二十四节气名（优先用 lunar.js 里的表）
    const SOLAR_TERMS = (typeof solarTerm !== 'undefined' && solarTerm.length === 24) ? solarTerm
        : ['小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
           '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'];

    // 第 n 个节气（n: 1=小寒 … 24=冬至）的公历日期
    function termDate(year, n) {
        if (typeof getTerm !== 'function') return null;
        const day = getTerm(year, n);
        if (!(day > 0)) return null;
        let m = Math.ceil(n / 2);
        while (m < 12 && day > daysInMonth(year, m)) { day -= daysInMonth(year, m); m += 1; }
        return new Date(year, m - 1, day);
    }

    // 今天之后最近的节气
    function nextTerm(d) {
        const today = startOfDay(d);
        for (let dy = 0; dy < 2; dy++) {
            for (let n = 1; n <= 24; n++) {
                const date = termDate(d.getFullYear() + dy, n);
                if (date && date >= today) {
                    return { name: SOLAR_TERMS[n - 1], date, days: Math.round((date - today) / 86400000) };
                }
            }
        }
        return null;
    }

    // 日出日落（SunCalc 精简算法，返回本地时间的 Date）
    function sunTimes(d, lat, lng) {
        if (!isFinite(lat) || !isFinite(lng)) return null;
        const rad = Math.PI / 180;
        const sin = x => Math.sin(x * rad);
        const cos = x => Math.cos(x * rad);
        const n = Math.ceil((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(2000, 0, 1, 12)) / 86400000 + 0.0008) - lng / 360;
        const M = (357.5291 + 0.98560028 * n) % 360;                                    // 平近点角
        const lambda = M + 1.9148 * sin(M) + 0.02 * sin(2 * M) + 0.0003 * sin(3 * M) + 180 + 102.9372;  // 黄经
        const transit = 2451545 + n + 0.0053 * sin(M) - 0.0069 * sin(2 * lambda);
        const sinDec = sin(lambda) * sin(23.44);
        const cosDec = Math.sqrt(1 - sinDec * sinDec);
        const cosOmega = (sin(-0.833) - sin(lat) * sinDec) / (cos(lat) * cosDec);
        if (!isFinite(cosOmega) || cosOmega > 1 || cosOmega < -1) return null;
        const omega = 180 * Math.acos(cosOmega) / Math.PI;
        const j2d = J => new Date(86400000 * (J - 2440587.5));
        return { rise: j2d(transit - omega / 360), set: j2d(transit + omega / 360) };
    }

    // 所在位置：配置优先，否则按时区粗略推算（经度取时区中央经线）
    function resolveGeo() {
        const tz = -new Date().getTimezoneOffset() / 4;
        return {
            lat: CONFIG.sun.lat != null ? +CONFIG.sun.lat : 22.5319,
            lng: CONFIG.sun.lng != null ? +CONFIG.sun.lng : tz
        };
    }

    const fmtHM = d => pad2(d.getHours()) + ':' + pad2(d.getMinutes());

    // 右侧迷你月历
    function buildGrid(d) {
        const y = d.getFullYear(), m = d.getMonth() + 1;
        const total = daysInMonth(y, m);
        const lead = (new Date(y, m - 1, 1).getDay() - CONFIG.gridWeekStart + 7) % 7;
        let h = '<div class="cal-grid">';
        for (let i = 0; i < 7; i++) h += '<span class="cal-hd">' + CONFIG.weekCn[(CONFIG.gridWeekStart + i) % 7] + '</span>';
        for (let i = 0; i < lead; i++) h += '<span class="cal-cell is-empty"></span>';
        for (let day = 1; day <= total; day++) {
            const today = day === d.getDate();
            h += '<span class="cal-cell' + (today ? ' is-today' : '') + '"' +
                (today ? ' aria-current="date" title="今天"' : '') + '>' + day + '</span>';
        }
        return h + '</div>';
    }

    // 底部附加行：下个节气 + 日出日落
    function buildExtra(d) {
        const term = nextTerm(d);
        const termHtml = term
            ? (term.days === 0 ? '今天就是<em class="cal-term">' + term.name + '</em>'
                               : term.days + '天后是<em class="cal-term">' + term.name + '</em>')
            : '';
        let sunHtml = '';
        if (CONFIG.sun.enable) {
            const geo = resolveGeo();
            const st = sunTimes(d, geo.lat, geo.lng);
            if (st) sunHtml = '<span class="cal-rise">☀️' + fmtHM(st.rise) + '</span><span class="cal-set">🌙' + fmtHM(st.set) + '</span>';
        }
        if (!termHtml && !sunHtml) return '';
        return '<div class="cal-extra">' +
            (termHtml ? '<span class="cal-extra-term">' + termHtml + '</span>' : '') +
            (sunHtml ? '<span class="cal-extra-sun">' + sunHtml + '</span>' : '') +
            '</div>';
    }

    function buildCalendarHTML(d) {
        const lunar = getLunar(d);
        return '<div class="cal-wrap" data-cal-mount>' +
            '<div class="cal-head">' +
            '<span class="cal-week">第' + isoWeek(d) + '周 ' + weekdayCn(d) + '</span>' +
            '<span class="cal-solar">' + d.getFullYear() + '年' + (d.getMonth() + 1) + '月 第' + dayOfYear(d) + '天</span>' +
            '</div>' +
            '<div class="cal-hero">' +
            '<span class="cal-daynum">' + pad2(d.getDate()) + '</span>' +
            (lunar ? '<span class="cal-lunar">' + lunar.gzYear + lunar.Animal + '年 ' + lunar.IMonthCn + lunar.IDayCn + '</span>' : '') +
            '</div>' +
            buildGrid(d) +
            buildExtra(d) +
            '</div>';
    }

    // 把渲染结果塞进卡片（首次替换骨架 .cal-skeleton，之后替换 [data-cal-mount]）
    function mount(box, html) {
        const old = box.querySelector('[data-cal-mount]') || box.querySelector('.cal-skeleton');
        if (old) { old.outerHTML = html; return; }
        const host = box.querySelector('.item-content') || box;
        const div = document.createElement('div');
        div.setAttribute('data-cal-mount', '');
        div.innerHTML = html;
        host.appendChild(div);
    }

    function render() {
        const box = document.getElementById(CONFIG.calendarEl);
        if (!box) return false;
        const now = new Date();
        mount(box, buildCalendarHTML(now));
        const lunar = getLunar(now);
        box.title = now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日 星期' +
            CONFIG.weekCn[now.getDay()] + (lunar ? ' · 农历' + lunar.IMonthCn + lunar.IDayCn : '');
        return true;
    }

    function init() {
        render();
        if (CONFIG.tickMs) {
            setInterval(() => { if (document.visibilityState !== 'hidden') render(); }, CONFIG.tickMs);
        }
        // pjax 翻页后侧栏是新的 DOM，重新渲染
        ['pjax:complete', 'pjax:success', 'pjax:end'].forEach(ev => document.addEventListener(ev, render));
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    // 调试用：控制台 RuyuanCalendar.render() 手动重绘
    window.RuyuanCalendar = { config: CONFIG, render, nextTerm, sunTimes, resolveGeo };
})();

// ===== 昼夜切换动画（三拍小剧场：日落/日出 → 暮色星初现 → 星夜铺满 → 从点击位置圆形揭幕）=====
// 设计：纯附加、零侵入。用 document 级事件委托（capture 阶段）在昼夜按钮点击时插入动画遮罩，
// 主题自己的 data-theme 切换 / snackbar / localStorage / 按钮样式全部不动。
// 动画播放期间遮罩盖住屏幕，主题瞬时切换，揭幕时揭示新主题。
//
// ══ 持续时间配置 ══
// JS: 下方 CONFIG（beat1/beat2/beat3/revealLag/reveal/lightK），页面加载时注入为 CSS 变量
// CSS: source/css/ruyuan.css 的 .dm-stage 变量 --dm-t1/--dm-t2/--dm-t3/--dm-rv（默认值同 JS，任改一边即生效）
const RuyuanNightSky = (() => {
    const CONFIG = {
        beat1: 450,     // 第一拍：日落/日出（天空渐变色铺开）
        beat2: 450,     // 第二拍：暮色 + 第一批星星亮起
        beat3: 600,     // 第三拍：星夜铺满（含揭幕）
        revealLag: 300, // 第三拍内再等 250ms 才揭幕（先让星星铺一半）
        reveal: 350,    // 圆形揭幕时长（圆从点击点扩大到 160vmax）
        lightK: 0.8,    // 转昼倍速：整体 ×0.8（夜间→白天动画缩短到约 1200ms）
        stars: 40,      // 星星数（≤600px 屏幕自动减半）
        selector: '#menu-darkmode, #darkmode, .darkmode_switchbutton', // 昼夜切换入口（右栏齿轮组#darkmode + 右侧菜单 + 侧栏/控制台开关）
    };
    const TOTAL = CONFIG.beat1 + CONFIG.beat2 + CONFIG.beat3;          // 1500 整屏遮挡总时长
    const REVEAL_AT = CONFIG.beat1 + CONFIG.beat2 + CONFIG.revealLag;  // 1150 开始揭幕

    let overlay = null;   // 正在播放的遮罩 { node, timers }
    let lastPoint = null; // 最近一次点击位置 → 揭幕圆心

    // 记住点击位置（capture 阶段，不论点到哪）
    document.addEventListener('pointerdown', e => {
        if (e && typeof e.clientX === 'number' && typeof e.clientY === 'number') {
            lastPoint = { x: e.clientX, y: e.clientY };
        }
    }, true);

    function reducedMotion() {
        try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
        catch (e) { return false; }
    }

    // 揭幕圆心：优先最近点击位置，退到第一个按钮中心，再退到右上角
    function origin() {
        if (lastPoint) return lastPoint;
        try {
            const btn = document.querySelector(CONFIG.selector.split(',')[0].trim());
            if (btn) {
                const r = btn.getBoundingClientRect();
                if (r && (r.width || r.height)) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
            }
        } catch (e) { /* fallthrough */ }
        return { x: (window.innerWidth || 1200) - 48, y: 64 };
    }

    // 清掉残留遮罩（连点第二次 / 被打断）：取消定时器并移除节点
    function clearOverlay() {
        const st = overlay;
        overlay = null;
        if (!st) return;
        st.timers.forEach(clearTimeout);
        if (st.node && st.node.parentNode) st.node.parentNode.removeChild(st.node);
    }

    function buildStage(toDark) {
        const stage = document.createElement('div');
        stage.className = 'dm-stage';
        stage.setAttribute('data-to', toDark ? 'dark' : 'light');
        // 时长注入：CSS 变量与 CONFIG 同步（CSS 里也有同名默认值，JS 注入优先生效）
        stage.style.setProperty('--dm-t1', CONFIG.beat1 + 'ms');
        stage.style.setProperty('--dm-t2', CONFIG.beat2 + 'ms');
        stage.style.setProperty('--dm-t3', CONFIG.beat3 + 'ms');
        stage.style.setProperty('--dm-rv', CONFIG.reveal + 'ms');
        const p = origin();
        stage.style.setProperty('--dm-x', Math.round(p.x) + 'px');
        stage.style.setProperty('--dm-y', Math.round(p.y) + 'px');

        // 视线层次（从下到上）：夜空 → 暮色 → 星星 → 太阳 → 月亮 → 远山 → 山脚辉光 → 流星
        stage.innerHTML =
            '<div class="dm-sky"></div><div class="dm-dusk"></div><div class="dm-stars"></div>' +
            '<div class="dm-sun"></div><div class="dm-moon"></div>' +
            '<div class="dm-horizon"></div><div class="dm-glow"></div><div class="dm-meteor"></div>';

        // 星星：前 20% 在第二拍先亮（暮色批），其余第三拍揭幕前铺满
        const n = (window.innerWidth || 1280) <= 600 ? Math.round(CONFIG.stars / 2) : CONFIG.stars;
        const first = Math.max(1, Math.round(n * 0.2));
        const box = stage.querySelector('.dm-stars');
        const frag = document.createDocumentFragment();
        for (let i = 0; i < n; i++) {
            const star = document.createElement('span');
            star.className = 'dm-star';
            const delay = i < first ? (CONFIG.beat1 + 30 + i * 20) : (REVEAL_AT - 270 + (i - first) * 12);
            star.style.cssText =
                '--dm-sx:' + (Math.random() * 98 + 1).toFixed(2) + '%;' +
                '--dm-sy:' + (Math.random() * 56 + 2).toFixed(2) + '%;' +
                '--dm-ss:' + (Math.random() < 0.25 ? '2.6' : '1.8') + 'px;' +
                '--dm-sd:' + Math.round(delay) + 'ms;' +
                '--dm-so:' + (0.6 + Math.random() * 0.4).toFixed(2) + ';';
            frag.appendChild(star);
        }
        if (box) box.appendChild(frag);
        document.body.appendChild(stage);

        const st = { node: stage, timers: [] };
        overlay = st;
        const k = toDark ? 1 : CONFIG.lightK;
        st.timers.push(setTimeout(() => {
            if (overlay !== st) return;          // 已被后续点击作废
            stage.classList.add('is-reveal');    // 圆形揭幕：--dm-r 0 → 160vmax
        }, Math.round(REVEAL_AT * k)));
        st.timers.push(setTimeout(() => {
            if (overlay === st) overlay = null;
            if (stage.parentNode) stage.parentNode.removeChild(stage);
        }, Math.round(TOTAL * k)));
        return st;
    }

    // toDark=true：当前白天，播放“入夜”动画；false：播放“转昼”倒放动画
    function play(toDark) {
        if (reducedMotion()) {   // 系统开启“减少动态效果”→ 不放动画
            console.info('[NightSky] 系统开启了“减少动态效果”(prefers-reduced-motion)，跳过动画');
            return;
        }
        clearOverlay();                // 连点：先收尾旧的再播新的
        console.info('[NightSky] 播放', toDark ? '入夜' : '转昼', '动画，圆心', JSON.stringify(origin()));
        buildStage(toDark);
    }

    // 当前不是 dark → 这次点击将转入夜间
    function toDarkNow() {
        return document.documentElement.getAttribute('data-theme') !== 'dark';
    }

    // 事件委托 + capture：捕获阶段先于主题自己的点击监听器插入遮罩，主题切换照常瞬时执行
    let bound = false;
    function bind() {
        if (bound) return;
        bound = true;
        document.addEventListener('click', e => {
            const t = e.target;
            const btn = t && t.closest ? t.closest(CONFIG.selector) : null;
            if (btn) {
                console.info('[NightSky] 命中昼夜按钮', btn.id || btn.className, '→ 切换', toDarkNow() ? '入夜' : '转昼');
                play(toDarkNow());
            }
        }, true);
        console.info('[NightSky] 昼夜动画模块就绪，监听入口:', CONFIG.selector);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
    else bind();

    // 调试用：控制台 RuyuanNightSky.play(true) 手动播放入夜动画 / .config 改时长
    window.RuyuanNightSky = { config: CONFIG, play, clear: clearOverlay };
})();
