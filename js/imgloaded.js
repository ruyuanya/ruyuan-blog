// 首页头图渐进加载（小图模糊占位 → 大图渐显）
/**
 * @description 实现 medium 的渐进加载背景的效果
 * 2026-10 可靠性修复：
 *   1.【主因】脚本是 async 加载，可能在 DOMContentLoaded 之后才执行，
 *      监听器永远不会触发 → 头图空白。用 readyState 兜底，两种时序都能初始化。
 *   2. 图片请求失败无重试 → 网络抖动即白屏。加指数退避重试 + 缓存绕过参数。
 *   3. data-pjax 脚本会被 Pjax 在每次导航时重放，监听器/实例无限累积，
 *      多个 loader 同时抢带宽 → 越用越容易加载失败。加启动守卫 + 单实例复用。
 *   4. insertBefore 前的 children 判断会在 header 无子节点时静默漏装，直接插入即可。
 *   5. --process 初始值改为按当前滚动位置计算，避免滚动恢复时状态不一致。
 */
(function () {
    'use strict';

    const config = {
        smallSrc: '/images/backgroundimg/m-big2.jpg', // 小图链接 尽可能配置小于100k的图片
        largeSrc: '/images/backgroundimg/m-big1.jpg', // 大图链接 最终显示的图片
        mobileSmallSrc: '/images/backgroundimg/m-small2.jpg', // 手机端小图链接 尽可能配置小于100k的图片
        mobileLargeSrc: '/images/backgroundimg/m-small1.jpg', // 手机端大图链接 最终显示的图片
        retry: 2, // 单张图失败后的额外重试次数
        retryDelay: 800 // 重试基础间隔(ms)，逐次翻倍
    };

    // 整个文档生命周期内只绑定一次（pjax 的 data-pjax 会重复执行本脚本）
    if (window.__imgloadedBooted) return;
    window.__imgloadedBooted = true;

    let instance = null;

    const isMobile = () => window.matchMedia('(max-width: 767px)').matches;
    const scrollProcess = () => Math.min(window.scrollY / window.innerHeight, 1);

    // 带重试的图片加载：网络抖动时自动重试；重试带缓存绕过参数，避免再次命中坏响应
    function loadImage(img, src, onLoaded) {
        let attempt = 0;
        const fire = () => {
            attempt++;
            img.src = attempt > 1
                ? src + (src.indexOf('?') > -1 ? '&' : '?') + '_r=' + attempt
                : src;
        };
        img.onload = () => { img.onerror = null; onLoaded(); };
        img.onerror = () => {
            if (attempt <= config.retry) {
                setTimeout(fire, config.retryDelay * attempt);
            } else {
                console.warn('[首页头图] 加载失败：' + src);
            }
        };
        fire();
    }

    class ProgressiveLoad {
        constructor(smallSrc, largeSrc) {
            this.smallSrc = smallSrc;
            this.largeSrc = largeSrc;
            // 这里的1是滚动全程渐变 改为0.3就是前30%渐变后固定前30%产生的渐变效果
            this._onScroll = () => {
                this.container.style.setProperty('--process', scrollProcess());
            };
            this.container = document.createElement('div');
            this.smallStage = document.createElement('div');
            this.largeStage = document.createElement('div');
            this.video = document.createElement('div');
            this.smallImg = new Image();
            this.largeImg = new Image();
            this.container.className = 'pl-container';
            this.container.style.setProperty('--process', scrollProcess());
            this.smallStage.className = 'pl-img pl-blur';
            this.largeStage.className = 'pl-img';
            this.video.className = 'pl-video';
            this.container.appendChild(this.smallStage);
            this.container.appendChild(this.largeStage);
            this.container.appendChild(this.video);
            window.addEventListener('scroll', this._onScroll, { passive: true });
        }

        mount(target) {
            // insertBefore 参照节点为 null 时等效 appendChild，无需判断 children
            target.insertBefore(this.container, target.children[0] || null);
            loadImage(this.smallImg, this.smallSrc, () => {
                this.smallStage.classList.add('pl-visible');
                this.smallStage.style.backgroundImage = `url('${this.smallSrc}')`;
            });
            loadImage(this.largeImg, this.largeSrc, () => {
                this.largeStage.classList.add('pl-visible');
                this.largeStage.style.backgroundImage = `url('${this.largeSrc}')`;
            });
        }

        dispose() {
            window.removeEventListener('scroll', this._onScroll);
            this.smallImg.onload = null;
            this.smallImg.onerror = null;
            this.largeImg.onload = null;
            this.largeImg.onerror = null;
            if (this.container.parentNode) {
                this.container.parentNode.removeChild(this.container);
            }
        }
    }

    function refresh() {
        const target = document.getElementById('page-header');
        const fullPage = !!(target && target.classList.contains('full_page'));
        if (!fullPage) {
            // 非首页（文章页等）：清理残留实例，避免 fixed 容器挂在页面背后
            if (instance) { instance.dispose(); instance = null; }
            return;
        }
        if (instance) instance.dispose();
        instance = new ProgressiveLoad(
            isMobile() ? config.mobileSmallSrc : config.smallSrc,
            isMobile() ? config.mobileLargeSrc : config.largeSrc
        );
        instance.mount(target);
        console.log('执行渐进背景替换');
    }

    // DOMContentLoaded 可能已经触发（async 脚本晚到时补监听永远等不到），readyState 兜底
    function onReady(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn, { once: true });
        } else {
            fn();
        }
    }

    onReady(refresh);
    document.addEventListener('pjax:complete', refresh);
})();
