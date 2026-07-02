function make_element(str) {
  const p = document.createElement("template")
  p.innerHTML = str
  return p.content.cloneNode(true).children[0]
}

async function evalScript(path) {
    let t = await fetch(path)
        .then((res) => res.text())
    window.eval(t)
}

const SUPPRESSED_WARNINGS = ['Download the React DevTools'];
const consoleInfo = console.info
console.info = function filterWarnings(msg, ...args) {
  if (!SUPPRESSED_WARNINGS.some((entry) => msg.includes(entry))) {
    consoleInfo(msg, ...args);
  }
};

window.addEventListener("beforeunload", function() {
  localStorage.setItem("scrollPosition", window.scrollY);
});

let PageResources

function hidePageLoadOverlay() {
    const overlay = document.querySelector('#page_load_overlay')
    if (!overlay || overlay.dataset.hidden === '1') {
        return
    }
    overlay.dataset.hidden = '1'
    overlay.style.opacity = '0'
    overlay.style.visibility = 'hidden'
    setTimeout(() => overlay.remove(), 220)
}

async function fetchResources() {
    let res = {
        mainCss: await fetch('/static/css/styles.css').then(res => res.text()),
        cfg: await fetch('/collections/config.json')
            .then(res => res.json()),
        posts: await fetch('/collections/posts.json')
            .then(res => res.json()),
        nav: await fetch('/collections/nav.json')
            .then(res => res.json()),
        projects: await fetch('/collections/projects.json')
            .then(res => res.json()),
        icons: {
            hn: await fetch('/static/img/icons/hn.svg')
                .then(res => res.text()),
            twitter: await fetch('/static/img/icons/twitter.svg')
                .then(res => res.text()),
            facebook: await fetch('/static/img/icons/facebook.svg')
                .then(res => res.text()),
            reddit: await fetch('/static/img/icons/reddit.svg')
                .then(res => res.text()),
            swipe: await fetch('/static/img/icons/swipe.svg')
                .then(res => res.text()),
            moon: await fetch('/static/img/icons/moon.svg')
                .then(res => res.text()),
            rss: await fetch('/static/img/icons/rss.svg')
                .then(res => res.text()),
        },
    };

    res.thisPost = res.posts.find(p => p.url === document.location.pathname)
    if (res.thisPost) {
        res.title = res.thisPost.title
        if (res.thisPost.draft) {
            res.title = res.title + " (DRAFT)"
        }
    } else {
        let navItem = res.nav.find(n => n.href === document.location.pathname)
        if (navItem) {
            res.title = navItem.name
        } else {
            res.title = ''
        }
    }
    return res
}

async function site_global_rendering() {
    applyThemeClass()
    await evalScript('/static/js/third_party/lodash.js')
    await evalScript('/static/js/third_party/react.js')
    await evalScript('/static/js/third_party/react-dom.js')

    PageResources = React.createContext()
    window.e = React.createElement

    const resources = await fetchResources()
    await renderBody(resources)
    document.querySelector('body > article').remove()
    await Promise.all([literal_links(), render_latex(), render_graphviz(), syntax_highlight()])
    setupArticleImageViewer()
    await populateHead(resources)
    post_render_setup()
}

function applyThemeClass() {
    let theme = 'dark'
    try {
        if (localStorage.getItem('theme') === 'light') {
            theme = 'light'
        }
    } catch (e) {
    }
    document.body.classList.add(theme)
    document.body.classList.remove(theme === 'light' ? 'dark' : 'light')
}

function setupArticleImageViewer() {
    const article = document.querySelector('#page_content article')
    if (!article) {
        return
    }

    article.querySelectorAll('img').forEach((img) => {
        if (img.dataset.viewerBound === '1') {
            return
        }
        img.dataset.viewerBound = '1'
        img.style.cursor = 'zoom-in'
        img.addEventListener('click', (event) => {
            event.preventDefault()
            show_image_tag(img)
        })
    })
}

async function renderBody(resources) {
    if (window.location.pathname === '/index.html') {
        document.body.setAttribute('render_date', `${new Date()}`)
    }
    document.body.classList.add('dark')

    const contentRoot = document.createElement('div')
    contentRoot.setAttribute('id', 'body_wrapper')
    document.body.prepend(contentRoot)

    await new Promise((resolve) => {
        ReactDOM.createRoot(contentRoot)
            .render(e(
                PageResources.Provider,
                {value: resources},
                e(Page, {pageHasRendered: () => resolve()})
            ))
    })
}

async function populateHead(resources) {
    document.head.appendChild(
        make_element(
            `<meta charset="UTF-8">`
        )
    )
    document.head.appendChild(
        make_element(
            `<link rel="icon" href="/favicon.ico" sizes="32x32" type="image/x-icon">`
        )
    )
    document.head.appendChild(
        make_element(
            `<meta name="viewport" content="width=device-width, min-width=600, initial-scale=1, minimum-scale=1">`
        )
    )
    document.head.appendChild(
        make_element(
            `<link rel="preconnect" href="https://fonts.gstatic.com">`
        )
    )
    document.querySelector('#post_load_css').appendChild(
        make_element(
            `<link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700&family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap" rel="stylesheet">`
        )
    )
    if (resources.thisPost) {
        document.head.appendChild(
            make_element(
                `<meta name="description" content="${resources.thisPost.description}">`
            )
        )
        document.head.appendChild(
            make_element(
                `<meta name="keywords" content="${resources.thisPost.tags.join(',')}">`
            )
        )
    }
    document.head.appendChild(
        make_element(`<title>${resources.title}</title>`)
    )
}

function Page({pageHasRendered}) {
    React.useEffect(() => {
        pageHasRendered()
    }, []);
    return e(
        React.Fragment,
        {},
        e(
            PageResources.Consumer, {},
            context => e('style', {}, context.mainCss)
        ),
        e('img', {src: '/static/img/bg.webp', className: 'bg', id: 'main_bg', loading: 'lazy'}),
        e(ViewBgBtn),
        e(Sidebar),
        e(PageContent),
        e('div', {id: 'post_load_css', style: {display: 'none'}})
    )
}

function ViewBgBtn() {
    return e(
        'div',
        {id: 'view_bg_btn'},
        e('div', {id: 'screen_img'})
    )
}

function titleToId(title) {
    return title.toLowerCase()
        .replaceAll(' ', '_')
        .replace(/[^\w]/g, '')
}

function tag_slug(tag) {
    return tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function Sidebar() {
    let marks = []
    try {
        if (document.querySelector('article').children[0].tagName !== 'H2') {
            marks = ['Top']
        }
    } catch (e) {
    }
    marks.push(...Array.from(document.querySelectorAll('article h2'))
        .map(el => el.textContent))

    return e(
        PageResources.Consumer,
        {},
        context => e(
            'div',
            {id: 'sidebar'},
            marks.length >= 2 ? e(
                'div',
                {className: 'toc-box'},
                e(
                    'div',
                    {className: 'heading'},
                    'Table of content'
                ),
                e(
                    'ol',
                    {className: 'content'},
                    marks.map(
                        mark => e(
                            'li',
                            {key: mark},
                            e(
                                'a',
                                {href: `#${titleToId(mark)}`},
                                mark
                            )
                        )
                    ),
                ),
            ) : null,
            e(
                'div',
                {className: 'contact-box'},
                e(
                    'div',
                    {className: 'heading'},
                    'Contact'
                ),
                e(
                    'div',
                    {className: 'content'},
                    e(
                        'button',
                        {},
                        'Subscribe'
                    ),
                    e(
                        'div',
                        {className: 'control-buttons'},
                        e(
                            'div',
                            {id: 'toggle_theme_wrapper'},
                            e(
                                SvgIcon,
                                {
                                    mask: true,
                                    backgroundSvg: context.icons.moon,
                                    id: 'toggle_theme',
                                    style: {width: '1.3em', height: '1.3em'}
                                }
                            ),
                        ),
                        e(
                            'a',
                            {href: '/rss.xml'},
                            e(
                                SvgIcon,
                                {
                                    backgroundSvg: context.icons.rss,
                                    id: 'toggle_theme',
                                    style: {width: '1.3em', height: '1.3em'}
                                }
                            ),
                        )
                    ),
                ),
            ),
            e(
                SvgIcon,
                {className: 'open', alt: 'open sidebar', backgroundSvg: context.icons.swipe}
            ),
            e(
                SvgIcon,
                {className: 'close', alt: 'close sidebar', backgroundSvg: context.icons.swipe}
            ),
        )
    )
}

function PageContent() {
    return e(
        PageResources.Consumer,
        {},
        context => e(
            'div',
            {id: 'page_content'},
            e(
                'header', {},
                e(
                    'nav', {},
                    context.nav
                        .map(item => e(
                            'a', {
                                href: item.href,
                                key: item.href,
                                className: item.href === window.location.pathname || item.href + 'index.html' === window.location.pathname
                                    ? 'current' : '',
                            },
                            item.name
                        ))
                ),
                e('h1', {id: 'main_title'}, context.title),
                context.thisPost ? e(
                    'ul', {className: 'tags_list'},
                    context.thisPost.tags
                        .map(tag => e('li', {key: tag}, e('a', {
                            className: 'tag_element',
                            href: `/tags/${tag_slug(tag)}.html`
                        }, tag)))
                ) : null
            ),
            e(Article, {}),
            e(
                PageResources.Consumer,
                {},
                (context) => e(
                    'footer', {},
                    e(
                        'div', {className: 'links'},
                        e(
                            'div', {className: 'social'},
                            e(
                                'div', {className: 'footer-title'},
                                'Share this page'
                            ),
                            e(SvgIcon, {
                                backgroundSvg: context.icons.twitter,
                                title: 'Twitter',
                                href: `https://twitter.com/share?text=${context.title}&url=${context.cfg.url + window.location.pathname}`
                            }),
                            e(SvgIcon, {
                                backgroundSvg: context.icons.facebook,
                                title: 'Facebook',
                                href: `https://www.facebook.com/sharer.php?u=${context.cfg.url + window.location.pathname}`
                            }),
                            e(SvgIcon, {
                                backgroundSvg: context.icons.reddit,
                                title: 'Reddit',
                                href: `https://www.reddit.com/submit?title=${context.title}&url=${context.cfg.url + window.location.pathname}`
                            }),
                            e(SvgIcon, {
                                backgroundSvg: context.icons.hn,
                                title: 'Hacker News',
                                href: `https://news.ycombinator.com/submitlink?t=${context.title}&u=${context.cfg.url + window.location.pathname}`
                            }),
                        )
                    )
                )
            )
        )
    )
}

function SvgIcon({backgroundSvg, mask, id, style, className, href, title, alt}) {
    let dataUrl = `url('data:image/svg+xml;base64,${btoa(backgroundSvg)}')`
    let attrs = {
        className: `svg-icon ${className || ''}`,
        id,
        title,
        alt,
        style: _.merge(
            mask ? {
                maskImage: dataUrl,
                WebkitMaskImage: dataUrl,
                maskPosition: 'center',
                WebkitMaskPosition: 'center',
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
                maskSize: 'contain',
                WebkitMaskSize: 'contain'
            } : {backgroundImage: dataUrl},
            style
        ),
    }
    if (href) {
        return e(
            'a',
            _.merge(
                attrs,
                {
                    href,
                    rel: 'noopener',
                    target: '_blank',
                }
            )
        )
    } else {
        return e(
            'div',
            _.merge(
                attrs,
                {}
            )
        )
    }
}

function Article() {
    let currentContent = [...document.querySelector('article').children]
    if (currentContent.length === 0) {
        return e('article')
    }
    if (currentContent[0].tagName !== 'H2') {
        currentContent.unshift(make_element(`<h2 style="display: none;">Top</h2>`))
    }
    const headerIdxs = []
    currentContent.forEach((el, idx) => {
        if (el.nodeName === 'H2') {
            headerIdxs.push(idx)
        }
    })
    const sections = []
    for (let i = 0; i < headerIdxs.length; i++) {
        sections.push({
            id: titleToId(currentContent[headerIdxs[i]].textContent),
            ref: React.createRef(),
            elements: currentContent.slice(headerIdxs[i], headerIdxs[i + 1] || 1000000),
        })
    }
    React.useEffect(() => {
        for (let section of sections) {
            for (let el of section.elements) {
                section.ref.current.appendChild(el)
            }
        }
    }, [])
    return e(
        'article', {},
        sections.map(
            ({id, ref}) => e(
                'section', {id: id, key: id, ref},
            )
        )
    )
}

async function literal_links() {
    document.querySelectorAll('a[literal]').forEach(
        el => el.setAttribute('href', el.textContent)
    )
}

async function syntax_highlight() {
    document.querySelectorAll('prog, progi').forEach(el => {
        el.setAttribute('role', 'figure')
        el.textContent = el.textContent.trim()
    })
    const els = [...document.querySelectorAll('prog[class]')]
    if (els.length > 0) {
        window.Prism = {manual: true};
        await evalScript("/static/js/third_party/prism.js")
        document.querySelector('#post_load_css').appendChild(
            make_element(`<link rel="stylesheet" href="/static/css/prism.css">`)
        )
        await Promise.all(els.map(
            el => new Promise((resolve) => {
                Prism.highlightElement(el, null, () => resolve())
            })
        ))
    }
}

async function render_latex() {
    const blocks = document.querySelectorAll('formula')
    if (blocks.length > 0) {
        await evalScript("/static/packages/katex/katex.js")
        await evalScript("/static/packages/katex/contrib/auto-render.js")
        document.querySelector('#post_load_css').appendChild(make_element(`<link rel="stylesheet" href="/static/packages/katex/katex.css">`))
        blocks.forEach(block => renderMathInElement(block))
    }
}

async function render_graphviz() {
    const blocks = document.querySelectorAll('.graphviz')
    if (blocks.length > 0) {
        await evalScript('/static/packages/vizjs/viz.js')
        await evalScript('/static/packages/vizjs/full.render.js')

        for (const block of blocks) {
            const viz = new Viz()
            const vizel = await viz.renderSVGElement(block.textContent)
            block.textContent = ''
            block.appendChild(vizel)
        }
    }
}

function post_render_setup() {
    document.querySelectorAll('.open, .close').forEach(e => e.style.display = null)
    document.querySelector('#sidebar .open').addEventListener('click', () => {
        let sidebar = document.querySelector('#sidebar')
        let body = document.querySelector('#page_content')
        sidebar.classList.add('up')
        body.style.opacity = 0
    })
    document.querySelector('#sidebar .close').addEventListener('click', () => {
        let sidebar = document.querySelector('#sidebar')
        let body = document.querySelector('#page_content')
        sidebar.classList.remove('up')
        body.style.opacity = 1
    })

    document.querySelectorAll('#sidebar .toc-box a').forEach(e => e.addEventListener('click', () => {
        document.querySelector('#sidebar .close').click()
    }))

    document.querySelector('#sidebar button').addEventListener(
        'click',
        e => {
            window.open('mailto:iaansagar@gmail.com?subject=Subscribe me to this blog')
        }
    )

    document.querySelector('#view_bg_btn').addEventListener('click', () => show_image_tag(document.querySelector('img#main_bg')))

    document.querySelector('#toggle_theme_wrapper').addEventListener('click', () => {
        if (document.body.classList.contains('dark')) {
            document.body.classList.remove('dark')
            document.body.classList.add('light')
            localStorage.setItem('theme', 'light')
        } else {
            document.body.classList.remove('light')
            document.body.classList.add('dark')
            localStorage.setItem('theme', 'dark')
        }
    })
}

function show_image_tag(tag) {
    let el = make_element(`<div class="image_viewer" id="$image_viewer_{tag.src}"><img src="${tag.src}"/></div>`)
    document.body.appendChild(el)
    setTimeout(() => {
        el.style.opacity = 1
    }, 50)
    function close_viewer() {
        el.style.opacity = 0
        setTimeout(() => {
            el.remove();
        }, 300)
    }
    el.addEventListener('click', () => close_viewer())
    function key_handler(e) {
        if (e.key === 'Escape') {
            close_viewer()
            document.removeEventListener('keydown', key_handler)
        }
    }
    document.addEventListener('keydown', key_handler)
}

async function render_tag_page(tagName) {
    try {
        await site_global_rendering()
        document.querySelector('#main_title').textContent = 'Tag: ' + tagName
        const posts = await fetch('/collections/posts.json').then(res => res.json())
        const list = document.querySelector('ul')
        let postCount = 0
        posts.filter(p => p.tags.indexOf(tagName) !== -1)
          .reverse()
          .forEach(post => {
            postCount++
            let tags = ''
            post.tags.forEach(tag => {
              tags += `<a class="tag_element" href="/tags/${tag_slug(tag)}.html">${tag}</a> `
            })
            list.appendChild(make_element(`
<li><div class="post_card">
<a style="display: block;" href="${post.url}"><h3>${post.title}</h3></a>
<div>${tags}</div>
<div class="post_description">${post.description}</div>
</div></li>`))
          })
        if (postCount === 0) {
          console.log(`no posts found with tag: "${tagName}"`)
        }
    } finally {
        hidePageLoadOverlay()
    }
}

async function render_tracks_list(wallpaper, prefix, tracks) {
    try {
        let article = document.querySelector('article')
        for (let track of tracks) {
            let path = `${prefix}${track}`
            article.appendChild(make_element(`<h2>${track}</h2>`))
            article.appendChild(make_element(`<audio controls src="${path}" preload="metadata"></audio>`))
        }

        const base_page_render = site_global_rendering()
        await base_page_render

        document.querySelector('#main_bg').src = wallpaper
        document.querySelector('#main_bg').style = 'filter: none;'

        const audio_helper_js = `
(() => {
    window.current_track = null
    document.querySelectorAll('audio').forEach(el => {
      el.addEventListener('play', () => {
        if (window.current_track && window.current_track !== el) {
          window.current_track.pause()
        }
        window.current_track = el
      })
    })
})()
`
        eval(audio_helper_js)
    } finally {
        hidePageLoadOverlay()
    }
}
