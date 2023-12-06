function theme_initialize() {
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light')
        document.body.classList.remove('dark')
    } else {
        document.body.classList.add('dark')
        document.body.classList.remove('light')
    }
}
theme_initialize()