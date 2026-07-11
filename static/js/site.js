function make_element(str) {
  const p = document.createElement("template")
  p.innerHTML = str.trim()
  return p.content.cloneNode(true).firstElementChild
}

function element(tag, attrs = {}, ...children) {
    const node = document.createElement(tag)
    Object.entries(attrs).forEach(([key, value]) => {
        if (value === null || value === undefined || value === false) return
        if (key === 'className') node.className = value
        else if (key === 'style' && typeof value === 'object') Object.assign(node.style, value)
        else if (key === 'textContent') node.textContent = value
        else if (key === 'html') node.innerHTML = value
        else if (key in node) node[key] = value
        else node.setAttribute(key, value === true ? '' : value)
    })
    children.flat(Infinity).forEach(child => {
        if (child !== null && child !== undefined) node.append(child.nodeType ? child : document.createTextNode(child))
    })
    return node
}

async function evalScript(path) {
    let t = await fetch(path)
        .then((res) => res.text())
    window.eval(t)
}

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
    const data = await fetch('/static/data.json').then(res => res.json())
    const res = {
        ...data,
    }

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
    const stylesheetReady = ensureStylesheet()
    const resources = await fetchResources()
    PageResources = resources
    renderBody(resources)
    document.querySelector('body > article').remove()
    literal_links()
    render_latex()
    const runInBackground = window.requestIdleCallback || (callback => setTimeout(callback, 0))
    runInBackground(() => syntax_highlight())
    setupArticleImageViewer()
    await populateHead(resources)
    await stylesheetReady
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

    contentRoot.append(
        element('img', {src: '/static/img/bg.webp', className: 'bg', id: 'main_bg', loading: 'lazy'}),
        element('div', {id: 'view_bg_btn'}, element('div', {id: 'screen_img'})),
        renderSidebar(resources),
        renderPageContent(resources),
        element('div', {id: 'post_load_css', style: {display: 'none'}})
    )
}

function ensureStylesheet() {
    const existing = document.querySelector('link[data-site-styles]')
    if (existing) return Promise.resolve()
    const link = element('link', {
        rel: 'stylesheet',
        href: '/static/css/styles.css',
        'data-site-styles': '1',
    })
    const ready = new Promise(resolve => {
        link.addEventListener('load', resolve, {once: true})
        link.addEventListener('error', resolve, {once: true})
    })
    document.head.appendChild(link)
    return ready
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
            `<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1">`
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

function titleToId(title) {
    return title.toLowerCase()
        .replaceAll(' ', '_')
        .replace(/[^\w]/g, '')
}

function tag_slug(tag) {
    return tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function renderSidebar(context) {
    let marks = []
    try {
        if (document.querySelector('article').children[0].tagName !== 'H2') {
            marks = ['Top']
        }
    } catch (e) {
    }
    marks.push(...Array.from(document.querySelectorAll('article h2'))
        .map(el => el.textContent))

    const toc = marks.length >= 2 ? element('div', {className:'toc-box'}, element('div',{className:'heading'},'Table of content'), element('ol',{className:'content'}, marks.map(mark => element('li',{},element('a',{href:`#${titleToId(mark)}`},mark)))) ) : null
    const controls = element('div',{className:'control-buttons'}, element('div',{id:'toggle_theme_wrapper'}, SvgIcon({iconName:'moon',mask:true,id:'toggle_theme',style:{width:'1.3em',height:'1.3em'}})), element('a',{href:'/rss.xml'}, SvgIcon({iconName:'rss',id:'toggle_rss',style:{width:'1.3em',height:'1.3em'}})))
    return element('div',{id:'sidebar'}, toc, element('div',{className:'contact-box'},element('div',{className:'heading'},'Contact'),element('div',{className:'content'},element('button',{},'Subscribe'),controls)), SvgIcon({iconName:'swipe',className:'open',alt:'open sidebar'}), SvgIcon({iconName:'swipe',className:'close',alt:'close sidebar'}))
}

function renderPageContent(context) {
    const nav = element('nav',{}, context.nav.map(item => element('a',{href:item.href,className:item.href === window.location.pathname || item.href + 'index.html' === window.location.pathname ? 'current' : ''},item.name)))
    const header = element('header',{},nav,element('h1',{id:'main_title'},context.title),context.thisPost ? element('ul',{className:'tags_list'},context.thisPost.tags.map(tag => element('li',{},element('a',{className:'tag_element',href:`/tags/${tag_slug(tag)}.html`},tag)))) : null)
    const social = ['twitter','facebook','reddit','hn'].map(name => SvgIcon({iconName:name,title:name === 'hn' ? 'Hacker News' : name[0].toUpperCase()+name.slice(1),href:`https://${name === 'twitter' ? 'twitter.com/share?text=' + encodeURIComponent(context.title) + '&url=' : name === 'facebook' ? 'www.facebook.com/sharer.php?u=' : name === 'reddit' ? 'www.reddit.com/submit?title=' + encodeURIComponent(context.title) + '&url=' : 'news.ycombinator.com/submitlink?t=' + encodeURIComponent(context.title) + '&u='}${context.cfg.url + window.location.pathname}`}))
    const footer = element('footer',{},element('div',{className:'links'},element('div',{className:'social'},element('div',{className:'footer-title'},'Share this page'),social)))
    return element('div',{id:'page_content'},header,renderArticle(),footer)
}

function renderArticle() {
    const currentContent = [...document.querySelector('article').children]
    if (currentContent.length === 0) return element('article')
    if (currentContent[0].tagName !== 'H2') currentContent.unshift(make_element('<h2 style="display:none">Top</h2>'))
    const headerIdxs = currentContent.map((el, idx) => el.nodeName === 'H2' ? idx : -1).filter(idx => idx !== -1)
    const article = element('article')
    headerIdxs.forEach((start, i) => {
        const heading = currentContent[start]
        const section = element('section',{id:titleToId(heading.textContent)})
        currentContent.slice(start, headerIdxs[i + 1] || currentContent.length).forEach(el => section.appendChild(el))
        article.appendChild(section)
    })
    return article
}

function SvgIcon({iconName, mask, id, style, className, href, title, alt}) {
    const icon = element(mask ? 'div' : 'img', {
        className: `svg-icon ${className || ''}`,
        id,
        title,
        alt,
        ...(mask ? {} : {src: `/static/img/icons/${iconName}.svg`}),
        style: Object.assign(mask ? {
            maskImage: `url('/static/img/icons/${iconName}.svg')`,
            WebkitMaskImage: `url('/static/img/icons/${iconName}.svg')`,
            maskPosition: 'center',
            WebkitMaskPosition: 'center',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            maskSize: 'contain',
            WebkitMaskSize: 'contain',
        } : {objectFit: 'contain'}, style || {}),
    })
    if (href) {
        return element('a', {href, rel:'noopener', target:'_blank'}, icon)
    }
    return icon
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
        els.forEach(el => Prism.highlightElement(el))
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
        const posts = PageResources.posts
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
