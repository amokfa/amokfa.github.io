function swiper_setup() {
    document.querySelectorAll('.open, .close').forEach(e => e.style.display = null)
    document.querySelector('#left-sidebar .open').addEventListener('click', () => {
        let left = document.querySelector('#left-sidebar')
        let right = document.querySelector('#right-sidebar')
        let body = document.querySelector('#page_content')
        left.classList.add('up')
        right.classList.remove('up')
        right.classList.add('down')
        body.style.opacity = 0
    })
    document.querySelector('#left-sidebar .close').addEventListener('click', () => {
        let curr = document.querySelector('#left-sidebar')
        let other = document.querySelector('#right-sidebar')
        let body = document.querySelector('#page_content')
        curr.classList.remove('up')
        other.classList.remove('down')
        body.style.opacity = 1
    })
    document.querySelector('#right-sidebar .open').addEventListener('click', () => {
        let curr = document.querySelector('#right-sidebar')
        let other = document.querySelector('#left-sidebar')
        let body = document.querySelector('#page_content')
        curr.classList.add('up')
        other.classList.remove('up')
        other.classList.add('down')
        body.style.opacity = 0
    })
    document.querySelector('#right-sidebar .close').addEventListener('click', () => {
        let curr = document.querySelector('#right-sidebar')
        let other = document.querySelector('#left-sidebar')
        let body = document.querySelector('#page_content')
        curr.classList.remove('up')
        other.classList.remove('down')
        body.style.opacity = 1
    })

    document.querySelectorAll('#left-sidebar .dialog a').forEach(e => e.addEventListener('click', () => {
        document.querySelector('#left-sidebar .close').click()
    }))
}

swiper_setup()

function form_ui_setup() {
    let box = document.querySelector('#right-sidebar input[type=email]')
    let toast = document.querySelector('#right-sidebar .message');
    document.querySelector('#right-sidebar button').addEventListener(
        'click',
        e => {
            window.open('mailto:iaansagar@gmail.com?subject=Subscribe me to this blog')
        }
    )
}
form_ui_setup()

function make_element(str) {
    const p = document.createElement("template")
    p.innerHTML = str
    return p.content.cloneNode(true).children[0]
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
document.querySelector('#view_bg_btn').addEventListener('click', () => show_image_tag(document.querySelector('img#main_bg')))

function theme_switcher_setup() {
    document.querySelector('#toggle_theme_wrapper').addEventListener('click', () => {
        if (document.body.classList.contains('dark')) {
            document.body.classList.remove('dark')
            document.body.classList.add('light')
            localStorage.setItem('theme', 'light')
        } else {
            document.body.classList.remove('lighjt')
            document.body.classList.add('dark')
            localStorage.setItem('theme', 'dark')
        }
    })
}
theme_switcher_setup()
